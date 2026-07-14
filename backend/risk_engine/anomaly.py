from __future__ import annotations

from functools import cached_property
from typing import Literal

import numpy as np
from sklearn.ensemble import IsolationForest

MODEL_VERSION = "iforest-synthetic-v1"
MODEL_RANDOM_SEED = 26026

StreamName = Literal["cyber", "transaction"]


class IsolationForestSupport:
    """Fixed-seed outlier gate with bounded, explainable point output."""

    @cached_property
    def cyber_model(self) -> IsolationForest:
        model = IsolationForest(
            n_estimators=96,
            contamination=0.08,
            random_state=MODEL_RANDOM_SEED,
            n_jobs=1,
        )
        return model.fit(self._cyber_training_data())

    @cached_property
    def transaction_model(self) -> IsolationForest:
        model = IsolationForest(
            n_estimators=96,
            contamination=0.08,
            random_state=MODEL_RANDOM_SEED,
            n_jobs=1,
        )
        return model.fit(self._transaction_training_data())

    def points(
        self,
        stream: StreamName,
        vector: tuple[float, ...],
        deviations: tuple[str, ...],
    ) -> int:
        """Return 0-10 points; the model acts only as a deterministic outlier gate."""

        if not deviations:
            return 0
        model = self.cyber_model if stream == "cyber" else self.transaction_model
        prediction = int(model.predict(np.asarray([vector], dtype=np.float64))[0])
        if prediction != -1:
            return 0
        return min(10, len(tuple(dict.fromkeys(deviations))) * 2)

    @staticmethod
    def _cyber_training_data() -> np.ndarray:
        rng = np.random.default_rng(MODEL_RANDOM_SEED)
        rows = np.zeros((256, 9), dtype=np.float64)
        rows[:, 0:3] = 1.0
        rows[:, 6] = np.clip(rng.normal(0.15, 0.18, 256), 0.0, 0.8)
        noise_rows = np.arange(0, 256, 31)
        rows[noise_rows, 0] = 0.0
        rows[noise_rows, 6] = 0.9
        return rows

    @staticmethod
    def _transaction_training_data() -> np.ndarray:
        rng = np.random.default_rng(MODEL_RANDOM_SEED)
        rows = np.zeros((256, 6), dtype=np.float64)
        rows[:, 0] = np.clip(rng.normal(1.0, 0.18, 256), 0.55, 1.65)
        rows[:, 1] = np.clip(rng.normal(1.0, 0.15, 256), 0.6, 1.6)
        rows[:, 2] = np.clip(rng.normal(0.35, 0.12, 256), 0.02, 1.0)
        rows[:, 3] = 0.0
        rows[:, 4] = 1.0
        rows[:, 5] = np.clip(rng.normal(0.55, 0.3, 256), 0.0, 1.8)
        return rows
