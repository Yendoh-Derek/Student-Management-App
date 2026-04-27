from typing import List

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sklearn.linear_model import LogisticRegression


class RiskRequest(BaseModel):
    grades: List[float] = Field(min_length=1)
    attendance_rate: float = Field(ge=0, le=1)


class RiskResponse(BaseModel):
    risk_level: str
    confidence: float


app = FastAPI(title="Student Risk AI Service", version="1.0.0")


def train_model() -> LogisticRegression:
    # Tiny synthetic dataset for demonstrable risk classification.
    x = np.array(
        [
            [85, 0.95],
            [78, 0.88],
            [65, 0.75],
            [58, 0.62],
            [45, 0.55],
            [38, 0.40],
            [90, 0.98],
            [72, 0.82],
            [50, 0.60],
            [30, 0.35],
        ]
    )
    y = np.array([0, 0, 1, 1, 2, 2, 0, 1, 2, 2])
    model = LogisticRegression(max_iter=500, multi_class="multinomial")
    model.fit(x, y)
    return model


model = train_model()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/student-risk", response_model=RiskResponse)
def predict_student_risk(payload: RiskRequest) -> RiskResponse:
    avg_grade = float(np.mean(payload.grades))
    features = np.array([[avg_grade, payload.attendance_rate]])

    probabilities = model.predict_proba(features)[0]
    prediction = int(np.argmax(probabilities))
    confidence = float(probabilities[prediction])

    risk_map = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
    return RiskResponse(risk_level=risk_map[prediction], confidence=round(confidence, 4))
