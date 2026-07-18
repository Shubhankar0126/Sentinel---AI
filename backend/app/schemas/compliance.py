from pydantic import BaseModel

from app.models.enums import ComplianceFramework


class ComplianceReportRequest(BaseModel):
    plant_id: str
    framework: ComplianceFramework = ComplianceFramework.OSHA
