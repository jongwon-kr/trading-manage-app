from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Python Quant Analysis API Server"}

@app.get("/api/analysis")
def get_analysis():
    return {"analysis_result": "some_data"}