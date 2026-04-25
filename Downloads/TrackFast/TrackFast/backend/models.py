from pydantic import BaseModel

class IncidentCreate(BaseModel):
    lat: float
    lng: float
    severity: str

class HospitalRequest(BaseModel):
    lat: float
    lng: float

class BookBedRequest(BaseModel):
    hospital_id: int
    incident_id: int