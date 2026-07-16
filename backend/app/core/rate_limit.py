from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Callable
from threading import Lock
from time import monotonic


class AuthenticationFailureLimiter:
    """Small in-process limiter for repeated demo-login failures.

    The limiter intentionally protects the prototype login surface without pretending to
    provide distributed production-grade abuse protection.
    """

    def __init__(
        self,
        *,
        failure_limit: int,
        window_seconds: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self._failure_limit = failure_limit
        self._window_seconds = window_seconds
        self._clock = clock
        self._failures: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def is_allowed(self, key: str) -> bool:
        with self._lock:
            failures = self._active_failures(key)
            return len(failures) < self._failure_limit

    def record_failure(self, key: str) -> None:
        with self._lock:
            failures = self._active_failures(key)
            failures.append(self._clock())

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def _active_failures(self, key: str) -> deque[float]:
        failures = self._failures[key]
        cutoff = self._clock() - self._window_seconds
        while failures and failures[0] <= cutoff:
            failures.popleft()
        return failures


class PublicDemoAccessLimiter:
    """Bound successful passwordless demo-session issuance per client address."""

    def __init__(
        self,
        *,
        request_limit: int,
        window_seconds: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self._request_limit = request_limit
        self._window_seconds = window_seconds
        self._clock = clock
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def consume(self, key: str) -> bool:
        """Atomically accept one request when the fixed window has capacity."""

        with self._lock:
            requests = self._active_requests(key)
            if len(requests) >= self._request_limit:
                return False
            requests.append(self._clock())
            return True

    def _active_requests(self, key: str) -> deque[float]:
        requests = self._requests[key]
        cutoff = self._clock() - self._window_seconds
        while requests and requests[0] <= cutoff:
            requests.popleft()
        return requests
