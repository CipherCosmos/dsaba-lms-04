"""
Database Performance Monitoring
Query optimization and performance tracking
"""

import time
import logging
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from sqlalchemy import event, Engine
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session
from src.config import settings

logger = logging.getLogger(__name__)


class DatabaseMonitor:
    """
    Database performance monitoring and query optimization
    """

    def __init__(self):
        self.query_stats: Dict[str, Dict[str, Any]] = {}
        self.slow_query_threshold = 1.0  # seconds
        self.enabled = settings.PROMETHEUS_ENABLED or settings.DEBUG

    def enable_query_monitoring(self, engine: Engine) -> None:
        """
        Enable SQLAlchemy query monitoring

        Args:
            engine: SQLAlchemy engine instance
        """
        if not self.enabled:
            return

        @event.listens_for(engine, "before_execute")
        def before_execute(conn, clauseelement, multiparams, params):
            conn._query_start_time = time.time()
            conn._query_sql = str(clauseelement)

        @event.listens_for(engine, "after_execute")
        def after_execute(conn, clauseelement, multiparams, params, result):
            if hasattr(conn, '_query_start_time'):
                duration = time.time() - conn._query_start_time
                query_sql = getattr(conn, '_query_sql', 'Unknown')

                # Log slow queries
                if duration > self.slow_query_threshold:
                    logger.warning(
                        f"Slow query detected: {duration:.3f}s - {query_sql[:200]}..."
                    )

                # Track query statistics
                self._track_query_stats(query_sql, duration)

    def _track_query_stats(self, query: str, duration: float) -> None:
        """
        Track query execution statistics

        Args:
            query: SQL query string
            duration: Query execution time in seconds
        """
        # Simple query pattern extraction (first few words)
        query_pattern = ' '.join(query.split()[:3])

        if query_pattern not in self.query_stats:
            self.query_stats[query_pattern] = {
                'count': 0,
                'total_time': 0.0,
                'avg_time': 0.0,
                'max_time': 0.0,
                'min_time': float('inf')
            }

        stats = self.query_stats[query_pattern]
        stats['count'] += 1
        stats['total_time'] += duration
        stats['max_time'] = max(stats['max_time'], duration)
        stats['min_time'] = min(stats['min_time'], duration)
        stats['avg_time'] = stats['total_time'] / stats['count']

    def get_query_stats(self) -> Dict[str, Dict[str, Any]]:
        """
        Get query execution statistics

        Returns:
            Dictionary of query patterns and their statistics
        """
        return self.query_stats.copy()

    def get_connection_pool_stats(self, engine: Engine) -> Dict[str, Any]:
        """
        Get database connection pool statistics

        Args:
            engine: SQLAlchemy engine instance

        Returns:
            Dictionary with pool statistics
        """
        pool = engine.pool
        return {
            'pool_size': getattr(pool, 'size', 0),
            'checked_in': getattr(pool, 'checkedin', 0),
            'checked_out': getattr(pool, 'checkedout', 0),
            'overflow': getattr(pool, 'overflow', 0),
            'invalid': getattr(pool, 'invalid', 0),
            'recycle_time': getattr(settings, 'DB_POOL_RECYCLE', 3600),
            'timeout': getattr(settings, 'DB_POOL_TIMEOUT', 30)
        }

    def log_performance_report(self) -> None:
        """
        Log a performance report with query stats and pool info
        """
        if not self.enabled:
            return

        logger.info("=== Database Performance Report ===")

        # Query statistics
        if self.query_stats:
            logger.info("Top 10 query patterns by total time:")
            sorted_queries = sorted(
                self.query_stats.items(),
                key=lambda x: x[1]['total_time'],
                reverse=True
            )[:10]

            for pattern, stats in sorted_queries:
                logger.info(
                    f"  {pattern}: {stats['count']} queries, "
                    f"total={stats['total_time']:.3f}s, "
                    f"avg={stats['avg_time']:.3f}s, "
                    f"max={stats['max_time']:.3f}s"
                )

        # Connection pool stats
        from .session import get_engine
        engine = get_engine()
        pool_stats = self.get_connection_pool_stats(engine)

        logger.info("Connection pool status:")
        logger.info(f"  Pool size: {pool_stats['pool_size']}")
        logger.info(f"  Checked in: {pool_stats['checked_in']}")
        logger.info(f"  Checked out: {pool_stats['checked_out']}")
        logger.info(f"  Overflow: {pool_stats['overflow']}")
        logger.info(f"  Invalid: {pool_stats['invalid']}")

        logger.info("=== End Performance Report ===")


@contextmanager
def query_timer(query_name: str, log_threshold: float = 1.0):
    """
    Context manager to time database operations

    Args:
        query_name: Name/description of the query
        log_threshold: Threshold in seconds to log as warning
    """
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        if duration > log_threshold:
            logger.warning(f"Slow operation '{query_name}': {duration:.3f}s")
        elif settings.DEBUG:
            logger.debug(f"Operation '{query_name}': {duration:.3f}s")


class QueryOptimizer:
    """
    Query optimization utilities
    """

    @staticmethod
    def optimize_student_marks_query(session: Session, student_id: int) -> List[Dict[str, Any]]:
        """
        Optimized query for student marks with eager loading

        Args:
            session: Database session
            student_id: Student ID

        Returns:
            List of marks with optimized loading
        """
        from sqlalchemy.orm import joinedload, selectinload
        from .models import MarkModel, ExamModel, SubjectAssignmentModel, SubjectModel

        # Use selectinload for collections and joinedload for single relationships
        marks = session.query(MarkModel).options(
            joinedload(MarkModel.exam).joinedload(ExamModel.subject_assignment).joinedload(SubjectAssignmentModel.subject),
            joinedload(MarkModel.question)
        ).filter(
            MarkModel.student_id == student_id
        ).all()

        return marks

    @staticmethod
    def optimize_batch_marks_query(session: Session, batch_instance_id: int) -> List[Dict[str, Any]]:
        """
        Optimized query for batch marks aggregation

        Args:
            session: Database session
            batch_instance_id: Batch instance ID

        Returns:
            Aggregated marks data
        """
        from sqlalchemy import func
        from .models import MarkModel, StudentModel, ExamModel, SubjectAssignmentModel

        # Use SQL aggregation for better performance
        result = session.query(
            StudentModel.id.label('student_id'),
            StudentModel.roll_no,
            func.count(MarkModel.id).label('total_marks'),
            func.sum(MarkModel.marks_obtained).label('total_score'),
            func.avg(MarkModel.marks_obtained).label('avg_score')
        ).join(
            MarkModel, StudentModel.id == MarkModel.student_id
        ).join(
            ExamModel, MarkModel.exam_id == ExamModel.id
        ).join(
            SubjectAssignmentModel, ExamModel.subject_assignment_id == SubjectAssignmentModel.id
        ).filter(
            StudentModel.batch_instance_id == batch_instance_id
        ).group_by(
            StudentModel.id, StudentModel.roll_no
        ).all()

        return result

    @staticmethod
    def get_query_explain_plan(session: Session, query) -> str:
        """
        Get EXPLAIN plan for a query (PostgreSQL only)

        Args:
            session: Database session
            query: SQLAlchemy query object

        Returns:
            EXPLAIN plan as string
        """
        if str(settings.DATABASE_URL).startswith("postgresql"):
            try:
                explain_query = session.query(query.subquery()).prefix_with("EXPLAIN")
                result = session.execute(explain_query).fetchall()
                return "\n".join([row[0] for row in result])
            except Exception as e:
                logger.warning(f"Could not get EXPLAIN plan: {e}")
                return "EXPLAIN not available"
        else:
            return "EXPLAIN only available for PostgreSQL"


# Global monitor instance
db_monitor = DatabaseMonitor()
query_optimizer = QueryOptimizer()