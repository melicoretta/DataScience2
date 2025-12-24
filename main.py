from fastapi import FastAPI
import pickle
from pydantic import BaseModel
import pandas as pd

# Load the model
with open("random_forest.pkl", "rb") as f_in:
    model_randomforest = pickle.load(f_in)

with open("decision_tree.pkl", "rb") as f_in:
    model_decisiontree = pickle.load(f_in)

with open("XGBoost.pkl", "rb") as f_in:
    model_XGBoost = pickle.load(f_in)




expected_features = [
    "GCS_max", "GCS_mean", "Lactate_min", "Lactate_max", "Lactate_mean",
    "BUN_min", "BUN_mean", "AG_max", "AG_mean", "Bilirubin_max", "Bilirubin_mean",
    "AG_MEAN", "AG_MAX", "AG_MEDIAN", "AG_MIN", "AG_STD",
    "SYSBP_MIN", "SYSBP_MEAN", "SYSBP_STD",
    "DIASBP_MIN", "DIASBP_MEAN",
    "AGE",
    "RR_MEAN", "RR_STD", "RR_MAX",
    "TEMP_STD", "TEMP_MIN",
    "HR_MEAN", "HR_MAX",
    "age_adj_comorbidity_score",
]

class Client(BaseModel):
    GCS_max: float = 14.0
    GCS_mean: float = 12.5

    Lactate_min: float = 1.2
    Lactate_max: float = 3.8
    Lactate_mean: float = 2.4

    BUN_min: float = 18.0
    BUN_mean: float = 32.0

    AG_max: float = 18.0
    AG_mean: float = 14.5

    Bilirubin_max: float = 2.1
    Bilirubin_mean: float = 1.4

    AG_MEAN: float = 14.5
    AG_MAX: float = 18.0
    AG_MEDIAN: float = 14.0
    AG_MIN: float = 12.0
    AG_STD: float = 1.9

    SYSBP_MIN: float = 92.0
    SYSBP_MEAN: float = 118.0
    SYSBP_STD: float = 14.0

    DIASBP_MIN: float = 55.0
    DIASBP_MEAN: float = 72.0

    AGE: int = 67

    RR_MEAN: float = 22.0
    RR_STD: float = 4.1
    RR_MAX: float = 30.0

    TEMP_STD: float = 0.6
    TEMP_MIN: float = 36.4

    HR_MEAN: float = 96.0
    HR_MAX: float = 128.0

    age_adj_comorbidity_score: float = 5.0


app = FastAPI()

@app.post("/predict_XGBoost")
def predict(client: Client):
    data_dict = client.dict() 

    df = pd.DataFrame([data_dict]).reindex(columns=expected_features)

    pred_np = model_XGBoost.predict(df)[0]
    print(pred_np)

    # Convert numpy scalar 
    pred = int(pred_np) 

    return {"predicted_mortality_inhospital": pred}

@app.post("/predict_random_forest")
def predict(client: Client):
    data_dict = client.dict() 

    df = pd.DataFrame([data_dict]).reindex(columns=expected_features)

    pred_np = model_randomforest.predict(df)[0]

    # Convert numpy scalar 
    pred = int(pred_np) 

    return {"predicted_mortality_inhospital": pred}

@app.post("/predict_decision_tree")
def predict(client: Client):
    data_dict = client.dict() 

    df = pd.DataFrame([data_dict]).reindex(columns=expected_features)

    pred_np = model_decisiontree.predict(df)[0]

    # Convert numpy scalar 
    pred = int(pred_np) 

    return {"predicted_mortality_inhospital": pred}

    