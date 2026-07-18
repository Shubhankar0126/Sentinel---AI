FIRST TASK (MANDATORY)

Before generating any code:

1. Inspect the entire repository.
2. Discover all existing files.
3. Detect all datasets inside the datasets directory.
4. Detect file formats (.csv, .dat, .xlsx, .json).
5. Build an internal inventory of available datasets.
6. Use these datasets as the primary data source.
7. Generate ETL pipelines for each dataset.
8. Only generate synthetic data when no public dataset exists.
9. Never overwrite or ignore existing datasets.
10. Produce a summary of the discovered datasets before writing the application.
# Sentinel AI

Version: 1.0

Status: Build Specification

---

# ROLE

You are simultaneously acting as:

- Principal Software Engineer
- Principal AI Engineer
- Senior Product Manager
- Senior UX Designer
- Cloud Architect
- DevOps Engineer
- Database Architect
- Security Engineer
- MLOps Engineer

Your objective is NOT to generate sample code.

Your objective is to build a COMPLETE production-ready startup.

Do NOT stop after creating folder structures.

Do NOT generate TODOs.

Do NOT generate placeholders.

Do NOT skip features.

Continue generating files until the application builds successfully.

If the context window ends,

continue automatically from the previous response.

---

# PROJECT

Project Name

Sentinel AI

Tagline

AI Powered Industrial Safety Intelligence Platform

---

# PROBLEM STATEMENT

Industrial plants already generate enormous amounts of operational data.

Examples include

SCADA

PLC

IoT Sensors

Gas Sensors

Temperature Sensors

Pressure Sensors

Permit To Work

Maintenance Logs

Worker Tracking

Incident Reports

Inspection Reports

Shift Logs

Weather

However,

every system works independently.

Industrial accidents happen because nobody continuously correlates these data streams together.

Example

Gas Leak

+

Worker enters confined space

+

Hot Work Permit

+

Maintenance Activity

↓

Explosion

All data existed.

No intelligence connected it.

Sentinel AI solves this problem.

---

# PRODUCT VISION

Sentinel AI becomes the AI Brain for Industrial Safety.

Instead of monitoring only equipment,

Sentinel AI understands relationships between

people

machines

permits

maintenance

sensors

environment

regulations

historical incidents

and predicts accidents before they happen.

---

# PRODUCT POSITIONING

Sentinel AI is NOT

SCADA

MES

ERP

CMMS

Asset Management

Industrial Automation

Industrial Control

Instead,

Sentinel AI sits ABOVE all existing enterprise systems.

Example

SCADA

↓

IoT

↓

PLC

↓

Maintenance

↓

Permit

↓

Worker Tracking

↓

Sentinel AI

↓

Compound Risk Intelligence

↓

AI Recommendations

↓

Safety Officer

---

# TARGET USERS

Primary Users

Safety Officer

Plant Manager

EHS Head

Maintenance Manager

Operations Manager

Industrial Engineer

Emergency Response Team

Secondary Users

Executives

Auditors

Compliance Teams

---

# TARGET INDUSTRIES

Steel

Mining

Chemical

Oil & Gas

Power Plants

Manufacturing

Automotive

Cement

Refineries

Heavy Engineering

---

# PRIMARY GOAL

Reduce industrial accidents before they happen.

Not after.

---

# SUCCESS METRIC

System detects compound risks before accidents occur.

Provides explainable recommendations.

Reduces false negatives.

Supports human decision making.

---

# CORE IDEA

Sentinel AI is NOT another dashboard.

Sentinel AI is a decision intelligence platform.

---

# UNIQUE SELLING PROPOSITION

Current Industrial Systems answer

"What is happening?"

Sentinel AI answers

"What is likely to happen next?"

Why?

What should be done?

How urgent is it?

---

# CORE MODULES

1

Dashboard

2

Compound Risk Intelligence

3

AI Safety Copilot

4

Incident Center

5

Action Center

6

Plant Map

7

Analytics

8

Compliance Center

9

Notification Center

10

Administration

---

# FEATURE 1

Dashboard

Purpose

Provide a real-time operational overview.

Dashboard must contain

Live Plant Health

Active Incidents

Critical Risks

Open Permits

Workers Present

Equipment Health

AI Insights

Recent Recommendations

Weather

Alerts

Recent Activities

Risk Trend

---

# FEATURE 2

Compound Risk Intelligence

This is the HEART of Sentinel AI.

Inputs

Gas Sensors

Temperature

Pressure

Humidity

Maintenance

Permit

Worker Location

Equipment Health

Historical Incidents

Weather

Outputs

Risk Score

Confidence Score

Severity

Root Cause

Recommendation

Expected Consequence

Estimated Time To Failure

Explainability

The system MUST explain WHY a risk was generated.

---

# FEATURE 3

AI Safety Copilot

Powered by Gemini.

Capabilities

Answer questions.

Explain risks.

Generate recommendations.

Explain regulations.

Generate incident summaries.

Generate investigation reports.

Generate evacuation plans.

Generate executive summaries.

---

# FEATURE 4

Incident Center

Every incident must contain

Timeline

Location

Severity

Evidence

Sensor History

Worker Information

Equipment Information

Permit Information

AI Summary

Root Cause

Recommended Actions

Status

Owner

Attachments

---

# FEATURE 5

Action Center

Displays all AI recommendations.

Examples

Evacuate Zone

Suspend Permit

Notify Supervisor

Shutdown Equipment

Increase Ventilation

Perform Inspection

Every action must support

Assign

Track

Complete

Audit

---

# FEATURE 6

Plant Map

Interactive Map

Zones

Workers

Equipment

Sensors

Heatmap

Alerts

Risk Overlay

Clicking any object opens

History

Status

Risk

AI Explanation

---

# FEATURE 7

Analytics

Risk Trends

Incident Trends

Near Misses

Equipment Health

Worker Safety

Department Comparison

Zone Comparison

Predictive Trends

Weekly Reports

Monthly Reports

---

# FEATURE 8

Compliance Center

Supports

OSHA

ISO 45001

Factory Act

OISD

Generate compliance reports.

Highlight violations.

Suggest corrective actions.

---

# FEATURE 9

Notification Center

Real Time Alerts

Email

SMS

In App

Critical Alerts

Escalation Rules

---

# FEATURE 10

Administration

Users

Roles

Permissions

Plants

Zones

Equipment

Settings

Audit Logs

---

# DESIGN PHILOSOPHY

The application should feel like

Microsoft Defender

Palantir Foundry

Honeywell Forge

Siemens Xcelerator

NOT

A college project.

NOT

A Bootstrap admin panel.

Enterprise software only.

---

# UI STYLE

Modern

Minimal

Professional

Blue

White

Gray

Orange

Red for Critical

Dark Mode

Responsive

No neon colors.

No hacker theme.

---

# USER EXPERIENCE

Maximum 3 clicks to reach any feature.

Every screen should answer

What happened?

Why?

What should I do?

---

# PERFORMANCE GOALS

Dashboard

<2 sec

API

<300 ms

Risk Analysis

<2 sec

AI Response

<5 sec

---

# NON FUNCTIONAL REQUIREMENTS

Enterprise Security

Scalability

High Availability

Observability

Logging

Auditability

Explainability

Maintainability

Reusable Components

Clean Architecture

SOLID Principles

Production Ready

---

END OF PART 1

# SYSTEM ARCHITECTURE

Design Sentinel AI as an enterprise-grade, modular, scalable SaaS platform.

Follow Clean Architecture and Domain Driven Design (DDD).

Never create a monolithic application.

Every module must be loosely coupled.

The application should support future microservice migration.

---

# HIGH LEVEL ARCHITECTURE

                Data Sources
──────────────────────────────────────

AI4I Dataset

Tennessee Eastman Dataset

OSHA Incident Dataset

Generated Worker Dataset

Generated Permit Dataset

Generated Maintenance Dataset

Generated Weather Dataset

↓

Data Ingestion Layer

↓

Validation Layer

↓

Normalization Layer

↓

Knowledge Graph

↓

Compound Risk Engine

↓

Risk Intelligence API

↓

Gemini AI Copilot

↓

Recommendation Engine

↓

Dashboard

↓

Users

---

# TECHNOLOGY STACK

Frontend

Next.js 15

TypeScript

App Router

TailwindCSS

shadcn/ui

React Query

React Hook Form

Zod

Recharts

React Leaflet

Framer Motion

Lucide Icons

Axios

Backend

FastAPI

Python 3.12+

SQLAlchemy 2

Alembic

Pydantic v2

PostgreSQL

Async SQLAlchemy

Redis (optional)

Background Tasks

AI

Google Gemini 2.5 Flash

LangChain

Sentence Transformers

FAISS

NetworkX

Pandas

NumPy

Scikit Learn

Infrastructure

Docker

Docker Compose

GitHub Actions

Nginx

---

# PROJECT STRUCTURE

sentinel-ai/

frontend/

backend/

ai-engine/

datasets/

assets/

docs/

scripts/

docker/

.github/

README.md

docker-compose.yml

.env.example

---

# FRONTEND STRUCTURE

frontend/src/

app/

components/

ui/

layout/

charts/

common/

features/

dashboard/

risk/

incident/

analytics/

plant-map/

copilot/

action-center/

compliance/

notifications/

api/

hooks/

types/

constants/

utils/

styles/

lib/

---

# BACKEND STRUCTURE

backend/app/

api/

routes/

middleware/

core/

config.py

logging.py

security.py

database/

database.py

base.py

seed.py

models/

schemas/

services/

risk_engine/

knowledge_graph/

ai/

rag/

vector_store/

utils/

tests/

main.py

---

# AI ENGINE STRUCTURE

ai-engine/

prompts/

rag/

embeddings/

vector_store/

knowledge_graph/

reasoner/

recommendation_engine/

copilot/

evaluation/

---

# DATABASE

Use PostgreSQL.

Generate SQLAlchemy models.

Generate Alembic migrations.

Use UUID Primary Keys.

Use timestamps.

Use soft delete where appropriate.

Every table should contain

created_at

updated_at

---

# TABLES

Users

Plants

Zones

Equipment

Sensors

SensorReadings

Workers

WorkerLocations

Permits

Maintenance

Incidents

RiskEvents

Recommendations

Notifications

AuditLogs

ComplianceReports

Documents

ChatHistory

---

# USERS TABLE

id

name

email

password_hash

role

plant_id

status

created_at

updated_at

---

# PLANTS

id

name

location

industry

status

latitude

longitude

created_at

updated_at

---

# ZONES

id

plant_id

zone_name

risk_level

latitude

longitude

polygon

description

---

# EQUIPMENT

id

plant_id

zone_id

equipment_name

equipment_type

manufacturer

health_score

status

last_maintenance

next_maintenance

---

# SENSORS

id

equipment_id

zone_id

sensor_name

sensor_type

unit

min_value

max_value

status

---

# SENSOR READINGS

id

sensor_id

timestamp

value

quality

status

---

# WORKERS

id

worker_code

name

department

designation

phone

status

---

# WORKER LOCATIONS

id

worker_id

zone_id

timestamp

latitude

longitude

---

# PERMITS

id

permit_number

permit_type

worker_id

zone_id

equipment_id

start_time

end_time

status

approved_by

---

# MAINTENANCE

id

equipment_id

maintenance_type

status

assigned_to

scheduled_date

completed_date

remarks

---

# INCIDENTS

id

title

description

severity

zone_id

equipment_id

worker_id

incident_type

root_cause

status

reported_at

closed_at

---

# RISK EVENTS

id

zone_id

risk_score

severity

confidence

reason

recommendation

status

created_at

---

# RECOMMENDATIONS

id

risk_event_id

action

priority

assigned_to

status

completed_at

---

# NOTIFICATIONS

id

user_id

title

message

type

priority

read

created_at

---

# CHAT HISTORY

id

user_id

question

response

citations

timestamp

---

# AUDIT LOGS

id

user_id

action

resource

old_value

new_value

timestamp

---

# COMPLIANCE REPORTS

id

plant_id

framework

score

violations

recommendations

generated_at

---

# DATABASE RELATIONSHIPS

Plant

↓

Zones

↓

Equipment

↓

Sensors

↓

Sensor Readings

Worker

↓

Permits

↓

Zones

Maintenance

↓

Equipment

Risk Event

↓

Recommendation

Incident

↓

Zone

↓

Equipment

↓

Worker

---

# INDEXES

Create indexes on

timestamp

zone_id

equipment_id

worker_id

risk_score

incident_type

sensor_type

status

plant_id

---

# CONSTRAINTS

Use Foreign Keys everywhere.

Cascade delete only where safe.

Use NOT NULL appropriately.

Use ENUM for

Severity

Status

Permit Type

Equipment Status

Sensor Status

User Roles

---

# API ARCHITECTURE

/api/v1/

auth/

dashboard/

plants/

zones/

equipment/

workers/

permits/

maintenance/

incidents/

risk/

analytics/

copilot/

notifications/

compliance/

simulation/

---

# API RESPONSE FORMAT

Every API should return

success

message

data

pagination

errors

timestamp

Example

{
    "success": true,
    "message": "Data fetched successfully",
    "data": {},
    "timestamp": "..."
}

---

END OF PART 2

# BACKEND ARCHITECTURE

You are designing an enterprise-grade backend.

Use FastAPI.

Follow Clean Architecture.

Never write business logic inside API routes.

Business logic belongs only in the Service Layer.

---

# ARCHITECTURE

Client

↓

API Router

↓

Dependencies

↓

Service Layer

↓

Repository Layer

↓

Database

↓

Response

---

# PRINCIPLES

Follow

SOLID

DRY

KISS

Repository Pattern

Dependency Injection

Single Responsibility

Open Closed Principle

Type Safety

Reusable Services

---

# BACKEND FOLDER STRUCTURE

backend/app/

api/

routes/

auth.py

dashboard.py

plants.py

zones.py

equipment.py

workers.py

permits.py

maintenance.py

incidents.py

risk.py

analytics.py

copilot.py

notifications.py

simulation.py

compliance.py

health.py

middleware/

authentication.py

authorization.py

logging.py

request_logger.py

error_handler.py

core/

config.py

security.py

logging.py

constants.py

database/

database.py

base.py

seed.py

models/

schemas/

repositories/

services/

risk_engine/

knowledge_graph/

rag/

ai/

utils/

tests/

main.py

---

# API VERSIONING

All APIs must use

/api/v1/

Example

/api/v1/dashboard

/api/v1/risk

/api/v1/copilot

---

# HEALTH APIs

GET

/health

Returns

Application Health

Database Health

AI Status

Dataset Status

Version

Uptime

---

GET

/version

Returns

Application Version

Build

Commit

Environment

---

# AUTHENTICATION

JWT Authentication

Refresh Tokens

Password Hashing

bcrypt

Role Based Access Control

Roles

Admin

Plant Manager

Safety Officer

Maintenance

Viewer

---

# AUTHORIZATION

Every API must validate

Authentication

Authorization

Plant Access

Role Access

Ownership

---

# DASHBOARD API

GET

/dashboard

Returns

Plant Health

Active Risks

Workers Present

Equipment Status

Open Permits

Recent Incidents

Today's Alerts

Weekly Trend

Charts

---

# PLANT API

GET

/plants

GET

/plants/{id}

POST

/plants

PUT

/plants/{id}

DELETE

/plants/{id}

---

# ZONE API

CRUD

Zone Summary

Risk Score

Equipment Count

Worker Count

Incident Count

---

# EQUIPMENT API

CRUD

Equipment Health

Maintenance History

Current Sensor Values

Failure Prediction

---

# SENSOR API

CRUD

Live Sensor Readings

Historical Readings

Anomalies

Statistics

---

# WORKER API

CRUD

Current Zone

Assigned Permit

Current Task

Safety Status

Location History

---

# PERMIT API

CRUD

Open Permits

Permit Validation

Permit Conflict Detection

Permit Expiry

Permit History

---

# MAINTENANCE API

CRUD

Scheduled

Running

Completed

Overdue

Conflict Detection

---

# INCIDENT API

CRUD

Timeline

Evidence

Root Cause

Related Equipment

Related Workers

Related Sensors

Generate Report

Export PDF

---

# RISK API

POST

/risk/analyze

Input

Sensor Data

Worker Data

Maintenance

Permits

Equipment

Weather

Output

Risk Score

Severity

Confidence

Reason

Recommendation

AI Explanation

---

GET

/risk/history

Returns

Historical Risks

---

GET

/risk/live

Returns

Live Risk Feed

---

# AI COPILOT API

POST

/copilot/chat

Input

Question

Conversation History

Plant Context

Output

Gemini Response

Citations

Recommendations

Regulations

Related Incidents

---

GET

/copilot/history

Returns

Chat History

---

# ANALYTICS API

Risk Trends

Incident Trends

Near Misses

Equipment Health

Safety Score

Department Analytics

Monthly Reports

Export CSV

Export PDF

---

# COMPLIANCE API

Generate Report

Factory Act

OSHA

ISO45001

OISD

Risk Compliance

Violations

Recommendations

---

# NOTIFICATION API

Create

Update

Delete

Read

Unread

Escalation

---

# SIMULATION API

POST

/simulation/start

Available Scenarios

Gas Leak

Fire

Explosion

Chemical Leak

Machine Failure

Worker Collapse

Permit Conflict

Maintenance Conflict

Multiple Hazard

---

# SERVICES

Every Route must have a dedicated service.

Example

DashboardService

RiskService

IncidentService

WorkerService

EquipmentService

PermitService

MaintenanceService

AnalyticsService

ComplianceService

CopilotService

NotificationService

SimulationService

---

# REPOSITORY PATTERN

Never query SQLAlchemy directly inside Services.

Always use Repository.

Example

EquipmentRepository

WorkerRepository

SensorRepository

PermitRepository

RiskRepository

IncidentRepository

---

# VALIDATION

Use Pydantic v2

Every Request

Every Response

Every Query Parameter

Every Path Parameter

Must be validated.

---

# ERROR HANDLING

Use global exception handlers.

Never expose stack traces.

Return

HTTP Status

Message

Details

Timestamp

Request ID

---

# LOGGING

Log

Requests

Responses

Errors

Database Queries

AI Calls

Risk Predictions

Authentication

Use structured logging.

---

# SECURITY

CORS

Rate Limiting

JWT

Password Hashing

Environment Variables

Secrets

Input Validation

SQL Injection Protection

XSS Protection

CSRF Protection

---

# CONFIGURATION

Use

.env

Environment based settings

Development

Testing

Production

---

# DATABASE SESSION

Use Async SQLAlchemy.

Dependency Injection.

Automatic rollback on failure.

Connection pooling.

---

# BACKGROUND TASKS

Use FastAPI BackgroundTasks for

AI Summary Generation

Compliance Report

Incident Report

Notification Dispatch

---

# FILE STORAGE

Support

Images

Documents

Incident Evidence

Reports

Use local storage in development.

Support S3-compatible storage later.

---

# TESTING

pytest

Unit Tests

API Tests

Service Tests

Repository Tests

Authentication Tests

Risk Engine Tests

Minimum Coverage

80%

---

# ACCEPTANCE CRITERIA

Every endpoint must:

Return correct HTTP status codes.

Return validated response schemas.

Handle errors gracefully.

Require authentication where needed.

Log requests.

Be documented in Swagger.

Have unit tests.

Integrate correctly with the Service Layer.

No business logic should exist inside route files.

END OF PART 3

# AI ENGINE

The AI Engine is the HEART of Sentinel AI.

It is NOT a chatbot.

It is NOT an LLM wrapper.

It is an Industrial Decision Intelligence Engine.

Its purpose is to continuously understand relationships between industrial events and predict compound safety risks before accidents occur.

------------------------------------------------------------

AI PIPELINE

Industrial Data

↓

Validation

↓

Normalization

↓

Knowledge Graph

↓

Feature Engineering

↓

Compound Risk Engine

↓

Risk Score

↓

Gemini Context Builder

↓

Gemini Copilot

↓

Recommendation Engine

↓

Dashboard

------------------------------------------------------------

DATA SOURCES

The AI Engine must ingest data from

AI4I Dataset

Tennessee Eastman Dataset

OSHA Incident Dataset

Generated Worker Dataset

Generated Permit Dataset

Generated Maintenance Dataset

Generated Equipment Dataset

Weather API

Historical Incidents

Regulations

------------------------------------------------------------

KNOWLEDGE GRAPH

Implement Knowledge Graph using NetworkX.

The graph represents relationships instead of isolated records.

Entities

Plant

Zone

Equipment

Worker

Sensor

Permit

Maintenance

Incident

Weather

Risk

Recommendation

Every entity becomes a node.

Relationships become edges.

Example

Worker

↓

Zone

↓

Machine

↓

Permit

↓

Gas Sensor

↓

Maintenance

↓

Incident

↓

Recommendation

------------------------------------------------------------

GRAPH EDGE TYPES

WORKS_IN

LOCATED_IN

ATTACHED_TO

MAINTAINED_BY

PROTECTED_BY

CONNECTED_TO

HAS_SENSOR

CAUSES

AFFECTS

PREVENTS

REQUIRES

ASSIGNED_TO

REPORTED_IN

------------------------------------------------------------

COMPOUND RISK ENGINE

This is the core USP.

Never use simple anomaly detection only.

Instead,

correlate multiple independent signals.

Example

Gas > Threshold

+

Worker Present

+

Hot Work Permit

+

Maintenance Running

↓

Critical Explosion Risk

------------------------------------------------------------

INPUTS

Gas

Temperature

Pressure

Humidity

Vibration

Machine Failure

Equipment Health

Permit Type

Worker Count

Worker Location

Maintenance Status

Historical Incidents

Weather

Time of Day

Shift

------------------------------------------------------------

OUTPUT

Risk Score

0-100

Confidence

Severity

Risk Category

Root Cause

Evidence

Affected Assets

Affected Workers

Recommended Actions

Emergency Actions

Regulations

------------------------------------------------------------

RISK LEVELS

0-20

Safe

21-40

Low

41-60

Moderate

61-80

High

81-100

Critical

------------------------------------------------------------

RULE ENGINE

Implement explainable rule engine.

Example

IF

Gas > 80

AND

Temperature > 60

AND

Worker Present

AND

Hot Work Permit

THEN

Critical

Reason

Explosion Hazard

Recommendation

Evacuate immediately.

------------------------------------------------------------

SECOND RULE

IF

Equipment Health < 20

AND

Maintenance Overdue

AND

Worker Assigned

↓

Mechanical Failure

------------------------------------------------------------

THIRD RULE

IF

Historical Incident Similarity > 90%

↓

Increase Confidence

------------------------------------------------------------

FOURTH RULE

IF

Rain

AND

Electrical Maintenance

↓

Electrocution Risk

------------------------------------------------------------

FIFTH RULE

IF

Night Shift

AND

Low Worker Count

AND

High Gas

↓

Emergency Escalation

------------------------------------------------------------

AI REASONER

Every prediction MUST answer

What happened?

Why?

Why now?

What evidence exists?

What should be done?

What regulation applies?

------------------------------------------------------------

RECOMMENDATION ENGINE

Generate recommendations.

Example

Suspend Permit

Increase Ventilation

Notify Supervisor

Shutdown Equipment

Evacuate Zone

Dispatch Maintenance

Increase Inspection

Generate Emergency Report

------------------------------------------------------------

ROOT CAUSE ANALYSIS

Generate

Timeline

Contributing Factors

Sensor Evidence

Worker Activities

Permit Status

Maintenance Status

Weather

Historical Similarity

------------------------------------------------------------

GEMINI AI

Model

Gemini 2.5 Flash

Never ask Gemini to calculate risk.

Risk calculation belongs to Risk Engine.

Gemini explains.

Gemini summarizes.

Gemini recommends.

Gemini generates reports.

------------------------------------------------------------

PROMPT TEMPLATE

System Prompt

You are an Industrial Safety Expert.

Always prioritize worker safety.

Never hallucinate regulations.

Use only provided context.

If uncertain,

say

"I do not have enough operational evidence."

------------------------------------------------------------

USER PROMPT

Question

Current Plant Context

Current Risk Events

Knowledge Graph Summary

Relevant Regulations

Historical Incidents

Sensor Data

Worker Data

Permit Data

Maintenance Data

Generate response.

------------------------------------------------------------

RAG

Use FAISS

Chunk Size

500

Chunk Overlap

100

Embedding Model

Sentence Transformers

all-MiniLM-L6-v2

------------------------------------------------------------

DOCUMENTS

OSHA

Factory Act

ISO 45001

OISD

Internal Incident Reports

Emergency Procedures

------------------------------------------------------------

RAG PIPELINE

Documents

↓

Chunking

↓

Embeddings

↓

FAISS

↓

Retriever

↓

Top K

↓

Context Builder

↓

Gemini

------------------------------------------------------------

AI RESPONSE FORMAT

Summary

Current Situation

Evidence

Risk

Explanation

Recommendation

Applicable Regulations

Confidence

------------------------------------------------------------

AI MEMORY

Store

Conversation History

Recent Risks

Recent Recommendations

Plant Context

User Role

------------------------------------------------------------

EXPLAINABILITY

Every prediction must explain

WHY

Never return

Risk Score = 92

Instead

Risk Score = 92

Reason

Gas concentration exceeded threshold.

Hot Work Permit active.

Worker detected inside Zone.

Maintenance activity increased ignition probability.

Historical incident similarity = 87%.

------------------------------------------------------------

SCENARIO SIMULATOR

Support

Gas Leak

Chemical Leak

Fire

Explosion

Machine Failure

Permit Conflict

Worker Collapse

Confined Space Entry

Power Failure

Multiple Simultaneous Hazards

------------------------------------------------------------

AI GENERATED REPORTS

Incident Summary

Investigation Report

Root Cause Analysis

Executive Summary

Compliance Report

Emergency Report

Shift Summary

------------------------------------------------------------

AI SAFETY COPILOT

Example Questions

Why is Zone 3 dangerous?

Explain Risk Event #18.

Generate investigation report.

Show similar incidents.

Suggest preventive actions.

Generate evacuation plan.

What OSHA regulation applies?

------------------------------------------------------------

ACCEPTANCE CRITERIA

Knowledge Graph implemented.

Risk Engine implemented.

Rule Engine implemented.

Gemini integrated.

FAISS integrated.

RAG implemented.

Conversation Memory implemented.

Recommendations generated.

Reports generated.

Every AI response contains citations from retrieved documents.

Gemini is never responsible for numerical risk calculation.

Risk Engine remains deterministic and explainable.

END OF PART 4

# FRONTEND

Build an enterprise-grade frontend using

Next.js 15

TypeScript

App Router

TailwindCSS

shadcn/ui

TanStack Query

React Hook Form

Zod

Axios

Recharts

Leaflet

Framer Motion

Lucide Icons

Never build a generic admin panel.

The application should look like

Palantir Foundry

Microsoft Defender

Azure Portal

Honeywell Forge

Siemens Xcelerator

IBM Maximo

Professional Industrial SaaS.

------------------------------------------------------------

DESIGN SYSTEM

Primary

#2563EB

Secondary

#FFFFFF

Accent

#14B8A6

Success

#16A34A

Warning

#F59E0B

Critical

#DC2626

Background

#F8FAFC

Dark

#0F172A

------------------------------------------------------------

TYPOGRAPHY

Inter

Font Weight

400

500

600

700

Use large spacing.

Rounded corners.

Subtle shadows.

Professional cards.

------------------------------------------------------------

APPLICATION LAYOUT

Top Navigation

↓

Left Sidebar

↓

Content

↓

Right AI Insight Panel (Optional)

------------------------------------------------------------

SIDEBAR

Dashboard

Risk Intelligence

Plant Map

Incidents

Action Center

Analytics

Compliance

AI Copilot

Notifications

Settings

------------------------------------------------------------

TOP BAR

Logo

Current Plant

Search

Notifications

Dark Mode

User Profile

------------------------------------------------------------

LANDING PAGE

Professional SaaS Landing Page.

Sections

Hero

Features

How It Works

Architecture

Why Sentinel AI

Technology

Contact

Footer

Animations

Modern

Minimal

Responsive

------------------------------------------------------------

LOGIN PAGE

Professional login

Company Logo

Email

Password

Remember Me

Forgot Password

Sign In

------------------------------------------------------------

DASHBOARD

The Dashboard is Mission Control.

It must answer

What is happening?

Why?

What should I do?

------------------------------------------------------------

DASHBOARD CARDS

Plant Health

Current Risk Score

Workers Online

Equipment Health

Open Permits

Incidents Today

Maintenance Running

Weather

AI Confidence

------------------------------------------------------------

LIVE ALERT PANEL

Critical Alerts

Warning Alerts

Information Alerts

Clicking an alert opens

Evidence

Recommendation

Affected Workers

Affected Equipment

Timeline

------------------------------------------------------------

CHARTS

Risk Trend

Weekly Incidents

Equipment Health

Zone Comparison

Permit Status

Maintenance Status

Worker Distribution

Near Miss Trend

All charts must use Recharts.

------------------------------------------------------------

COMMAND CENTER

Build an enterprise command center.

Widgets

Plant Health

Live Risk Feed

Heatmap

Recent Incidents

Current Recommendations

Emergency Actions

Weather

Shift Status

------------------------------------------------------------

PLANT MAP

Interactive Plant Layout

Every Zone clickable

Every Equipment clickable

Every Worker visible

Every Sensor visible

Heatmap Overlay

Risk Overlay

Critical Zones blink

------------------------------------------------------------

WHEN USER CLICKS ZONE

Open Drawer

Display

Current Risk

Workers

Equipment

Maintenance

Permits

Sensor Values

Historical Incidents

AI Summary

------------------------------------------------------------

WHEN USER CLICKS EQUIPMENT

Equipment Name

Health Score

Maintenance History

Current Sensor Values

Predicted Failure

Risk Contribution

------------------------------------------------------------

RISK INTELLIGENCE PAGE

Display

Live Risk Cards

Risk Timeline

Evidence Panel

Affected Assets

Affected Workers

Recommendations

Root Cause

Confidence Score

------------------------------------------------------------

INCIDENT CENTER

Table

Search

Filter

Sort

Export

Incident Detail

Timeline

Images

Evidence

Root Cause

Recommendation

Generate PDF

------------------------------------------------------------

ACTION CENTER

Display

Pending Actions

Completed Actions

High Priority

Assign Action

Complete Action

Escalate Action

------------------------------------------------------------

AI COPILOT

Chat Interface

Suggested Questions

Conversation History

Citation Panel

Evidence Panel

Regulations

AI Summary

Quick Actions

------------------------------------------------------------

ANALYTICS

Executive Dashboard

Monthly Risk

Weekly Incidents

Equipment Health

Department Safety Score

Worker Exposure

Permit Analytics

Compliance Analytics

Export CSV

Export PDF

------------------------------------------------------------

COMPLIANCE

OSHA

ISO45001

Factory Act

OISD

Compliance Score

Violations

Recommendations

Download Report

------------------------------------------------------------

NOTIFICATIONS

Unread

Critical

Warning

Info

Search

Mark Read

Delete

------------------------------------------------------------

SETTINGS

Profile

Organization

Plant

Theme

Notifications

Security

API Keys

------------------------------------------------------------

COMPONENTS

Build reusable components.

Button

Card

StatCard

ChartCard

AlertCard

RiskCard

IncidentCard

EquipmentCard

WorkerCard

PermitCard

RecommendationCard

Timeline

Heatmap

MapMarker

Drawer

Dialog

Table

Badge

Progress

Loading

Skeleton

Toast

EmptyState

ErrorState

------------------------------------------------------------

STATE MANAGEMENT

React Query

Server State

Context API

UI State

Forms

React Hook Form

Validation

Zod

------------------------------------------------------------

LOADING

Every page

Skeleton

Spinner

Progress Bar

Never show blank page.

------------------------------------------------------------

ERRORS

Beautiful error pages.

Retry Button.

AI unavailable.

No Data.

404

500

------------------------------------------------------------

RESPONSIVE

Desktop

Laptop

Tablet

Mobile

Fully Responsive.

------------------------------------------------------------

ACCESSIBILITY

Keyboard Navigation

ARIA Labels

Color Contrast

Screen Reader

------------------------------------------------------------

ANIMATIONS

Framer Motion

Small

Professional

No excessive animations.

------------------------------------------------------------

THEME

Support

Light

Dark

System Theme

------------------------------------------------------------

ACCEPTANCE CRITERIA

Every page implemented.

Every route functional.

Every component reusable.

Every chart connected.

Every API integrated.

No dummy cards.

No lorem ipsum.

No placeholder images.

Professional enterprise UI.

Application should look investment ready.

END OF PART 5

# DEVOPS

Build Sentinel AI as a production-ready application.

Development

Docker Compose

Production

Docker

Nginx

Gunicorn/Uvicorn

Environment Variables

Health Checks

Automatic Restart

------------------------------------------------------------

DOCKER

Generate

Dockerfile

Frontend

Dockerfile

Backend

docker-compose.yml

Network

Volumes

Environment Variables

Health Checks

Production Build

Development Build

------------------------------------------------------------

DOCKER SERVICES

frontend

backend

postgres

redis (optional)

nginx

------------------------------------------------------------

POSTGRESQL

Create complete database.

Generate

Schema

Indexes

Constraints

Alembic Migrations

Seed Scripts

Connection Pooling

------------------------------------------------------------

SEED DATA

Load

AI4I Dataset

Tennessee Eastman Dataset

OSHA Dataset

Generate

Workers

Permits

Maintenance

Weather

Zones

Equipment

Sensors

Plant Layout

Risk Events

------------------------------------------------------------

CONFIGURATION

Use

.env.example

Variables

DATABASE_URL

GEMINI_API_KEY

JWT_SECRET

JWT_ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES

REFRESH_TOKEN_EXPIRE_DAYS

POSTGRES_USER

POSTGRES_PASSWORD

POSTGRES_DB

API_PREFIX

ENVIRONMENT

DEBUG

LOG_LEVEL

------------------------------------------------------------

SECURITY

Implement

JWT Authentication

Refresh Tokens

Password Hashing

bcrypt

CORS

Rate Limiting

Secure Headers

Environment Secrets

Input Validation

SQL Injection Protection

XSS Protection

CSRF Protection

Audit Logging

------------------------------------------------------------

LOGGING

Use structured logging.

Log

Requests

Responses

Authentication

Errors

Warnings

Risk Predictions

AI Calls

Database Errors

Application Startup

Application Shutdown

------------------------------------------------------------

MONITORING

Health Endpoint

Metrics

Database Health

AI Health

Dataset Status

System Uptime

Memory Usage

CPU Usage

------------------------------------------------------------

TESTING

Framework

pytest

Frontend Testing

Vitest

React Testing Library

Backend Tests

Unit Tests

Integration Tests

API Tests

Repository Tests

Risk Engine Tests

AI Tests

Coverage

80%+

------------------------------------------------------------

GITHUB ACTIONS

Generate

CI Pipeline

Backend Build

Frontend Build

Lint

Type Check

Run Tests

Docker Build

------------------------------------------------------------

CODE QUALITY

Use

Black

isort

flake8

mypy

ESLint

Prettier

Husky

Lint Staged

------------------------------------------------------------

README

Generate a professional README.

Include

Project Overview

Architecture

Features

Tech Stack

Installation

Running Locally

Docker Setup

Environment Variables

Folder Structure

API Documentation

Screenshots Placeholder

Demo Flow

Future Scope

Contributors

License

------------------------------------------------------------

ARCHITECTURE DOCUMENT

Generate

ARCHITECTURE.md

Include

High Level Architecture

Sequence Diagram

Component Diagram

Data Flow

Knowledge Graph

Risk Engine

RAG Pipeline

------------------------------------------------------------

API DOCUMENTATION

Generate

API.md

Include

Every Endpoint

Request

Response

Authentication

Examples

Error Codes

------------------------------------------------------------

DATABASE DOCUMENTATION

Generate

DATABASE.md

Include

ER Diagram

Relationships

Indexes

Constraints

Migration Strategy

------------------------------------------------------------

CONTRIBUTING

Generate

CONTRIBUTING.md

Include

Coding Standards

Branch Strategy

Commit Convention

Pull Requests

Testing

------------------------------------------------------------

LICENSE

Generate

MIT License

------------------------------------------------------------

DEMO MODE

Create Demo Mode.

When enabled,

simulate

Gas Leak

Temperature Rise

Pressure Increase

Worker Entry

Permit Conflict

Maintenance Conflict

Generate

Risk Event

AI Recommendation

Notification

Dashboard Update

Timeline

------------------------------------------------------------

EXPORTS

Generate

CSV Export

Excel Export

PDF Incident Report

Compliance Report

Executive Summary

------------------------------------------------------------

PERFORMANCE

Frontend

First Load < 3 sec

Backend API < 300 ms

Risk Engine < 2 sec

AI Response < 5 sec

------------------------------------------------------------

SCALABILITY

Design system to support

Multiple Plants

Thousands of Workers

Millions of Sensor Records

Multiple Organizations

Future Microservices

------------------------------------------------------------

FINAL ACCEPTANCE CRITERIA

The repository is considered COMPLETE only if ALL of the following are true:

✓ Frontend builds successfully.

✓ Backend builds successfully.

✓ Docker Compose starts all required services.

✓ PostgreSQL initializes correctly.

✓ Alembic migrations run successfully.

✓ Seed scripts populate the database.

✓ Swagger documentation loads.

✓ Authentication works.

✓ Dashboard displays live data.

✓ AI Copilot responds using Gemini.

✓ RAG retrieves relevant regulatory context.

✓ Compound Risk Engine produces deterministic and explainable risk scores.

✓ Knowledge Graph is operational.

✓ Plant Map renders correctly.

✓ Analytics charts display real data.

✓ Incident Center functions end-to-end.

✓ Action Center manages recommendations.

✓ Compliance reports generate correctly.

✓ Unit tests pass.

✓ Integration tests pass.

✓ All imports resolve.

✓ No TODO comments remain.

✓ No placeholder components remain.

✓ No placeholder APIs remain.

✓ No fake buttons remain.

✓ No broken routes remain.

✓ No runtime errors remain.

------------------------------------------------------------

FINAL EXECUTION INSTRUCTIONS

You are NOT generating an example project.

You are generating a REAL production-ready software product.

Do not stop after creating folder structures.

Do not stop after creating boilerplate.

Continue until every feature described in this specification has been implemented.

Whenever the output limit is reached:

1. Continue automatically from the exact previous point.
2. Never repeat previously generated code.
3. Never summarize unfinished work.
4. Continue generating the remaining files until the repository is complete.

The final deliverable must be a fully runnable repository that can be cloned, configured with environment variables, and started locally using Docker Compose or standard development commands.

Do not replace implementation with comments such as:
- TODO
- Implement later
- Placeholder
- Mock
- Sample only

Every feature must contain working implementation.

Treat this document as the single source of truth for the project.
# DATASET INTEGRATION (MANDATORY)

The project MUST use the datasets that already exist inside the repository.

Never generate replacement datasets if these folders exist.

Repository Structure

datasets/

├── ai4i/
│   └── ai4i2020.csv
│
├── tennessee/
│   └── TEdata/
│       ├── d00.dat
│       ├── d00_te.dat
│       ├── d01.dat
│       ├── ...
│
├── osha/
│   └── severe_injury.csv
│
└── generated/

------------------------------------------------------------

Dataset Usage

AI4I Dataset

Purpose

Equipment Health

Machine Failure Prediction

Maintenance Analytics

Equipment Health Score

Remaining Useful Life Estimation

------------------------------------------------------------

Tennessee Eastman Dataset

Purpose

Industrial Process Monitoring

Sensor Data

Gas

Pressure

Temperature

Flow

Fault Detection

Risk Intelligence

The AI must automatically create a parser that converts every .dat file into structured Pandas DataFrames.

The parser must assign proper feature names.

The parser must support all fault scenarios.

------------------------------------------------------------

OSHA Dataset

Purpose

Historical Incident Analysis

Incident Timeline

Incident Similarity

AI Report Generation

Analytics

------------------------------------------------------------

Generated Dataset

Purpose

Workers

Permits

Maintenance

Plant Layout

Weather

These should ONLY be generated because no public dataset exists.

------------------------------------------------------------

Create

scripts/

load_ai4i.py

scripts/

load_tennessee.py

scripts/

load_osha.py

scripts/

seed_generated_data.py

------------------------------------------------------------

The backend must automatically ingest these datasets into PostgreSQL.

Create ETL pipelines.

Validation

Cleaning

Transformation

Database Loading

------------------------------------------------------------

Never hardcode CSV paths.

Always use configuration.

Example

DATASET_ROOT=datasets/

------------------------------------------------------------

If datasets are missing,

show meaningful errors.

Do NOT silently fail.

------------------------------------------------------------

Never replace these datasets with fake examples.

Only generate data for modules where no public dataset exists.


END OF MASTER_BUILD_PROMPT.md