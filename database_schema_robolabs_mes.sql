--
-- PostgreSQL database dump
--

\restrict zgdJBTYxawmmDFEBAMCpwVCLszhUfBBjQ0QzHAqkazRLL9Et9s8OOXGWs2VGmQT

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: OperationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OperationStatus" AS ENUM (
    'new',
    'work',
    'done'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AppUser; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AppUser" (
    id integer NOT NULL,
    login text NOT NULL,
    role text NOT NULL,
    "displayName" text NOT NULL,
    "passwordHash" text,
    "terminalQrToken" text,
    "workCenterSection" text,
    "isTerminalOnly" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "personId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AppUser_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AppUser_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AppUser_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AppUser_id_seq" OWNED BY public."AppUser".id;


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id integer NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    action text NOT NULL,
    actor text,
    "beforeJson" jsonb,
    "afterJson" jsonb,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AuditLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AuditLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AuditLog_id_seq" OWNED BY public."AuditLog".id;


--
-- Name: DeviationReason; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeviationReason" (
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    "timeCategory" text NOT NULL,
    "affectsWorkerKpi" boolean DEFAULT true NOT NULL,
    "requiresSupervisorNote" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ImportBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ImportBatch" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status text NOT NULL,
    "rowsTotal" integer DEFAULT 0 NOT NULL,
    "rowsCreated" integer DEFAULT 0 NOT NULL,
    "rowsUpdated" integer DEFAULT 0 NOT NULL,
    "errorsJson" jsonb
);


--
-- Name: ImportBatch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ImportBatch_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ImportBatch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ImportBatch_id_seq" OWNED BY public."ImportBatch".id;


--
-- Name: NomenclatureProcessRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NomenclatureProcessRecord" (
    id text NOT NULL,
    equipment text NOT NULL,
    "productCode" text NOT NULL,
    category text NOT NULL,
    "operationsCount" integer DEFAULT 0 NOT NULL,
    "totalNormHours" double precision DEFAULT 0 NOT NULL,
    confidence text DEFAULT 'manual'::text NOT NULL,
    data jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OperationEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OperationEvent" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "orderOperationId" integer NOT NULL,
    "eventType" text NOT NULL,
    "personId" integer,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payload jsonb
);


--
-- Name: OperationEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OperationEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OperationEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OperationEvent_id_seq" OWNED BY public."OperationEvent".id;


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id integer NOT NULL,
    "orderNumber" text NOT NULL,
    "productCode" text NOT NULL,
    "productName" text,
    quantity integer NOT NULL,
    "dueDate" timestamp(3) without time zone,
    customer text,
    priority text,
    comment text,
    "sourceFile" text,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OrderOperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderOperation" (
    id integer NOT NULL,
    "orderId" integer NOT NULL,
    "operationCode" text NOT NULL,
    flow text NOT NULL,
    name text NOT NULL,
    section text NOT NULL,
    "normHours" double precision NOT NULL,
    "previousOperationCodes" text[],
    "nextOperationCodes" text[],
    "sortOrder" integer NOT NULL,
    status public."OperationStatus" DEFAULT 'new'::public."OperationStatus" NOT NULL,
    "lifecycleStatus" text DEFAULT 'new'::text NOT NULL,
    "assignedPersonId" integer,
    "startedAt" timestamp(3) without time zone,
    "finishedAt" timestamp(3) without time zone,
    "actualHours" double precision,
    "pauseHours" double precision DEFAULT 0,
    comment text
);


--
-- Name: OrderOperation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OrderOperation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OrderOperation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OrderOperation_id_seq" OWNED BY public."OrderOperation".id;


--
-- Name: Order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Order_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Order_id_seq" OWNED BY public."Order".id;


--
-- Name: Person; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Person" (
    id integer NOT NULL,
    "fullName" text NOT NULL,
    section text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: Person_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Person_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Person_id_seq" OWNED BY public."Person".id;


--
-- Name: ProductionCalendarDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionCalendarDay" (
    id integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "dayType" text DEFAULT 'workday'::text NOT NULL,
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductionCalendarDay_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductionCalendarDay_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductionCalendarDay_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductionCalendarDay_id_seq" OWNED BY public."ProductionCalendarDay".id;


--
-- Name: ProductionOperationEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionOperationEvent" (
    id integer NOT NULL,
    "runId" text NOT NULL,
    "unitId" text,
    "operationPk" text,
    "eventType" text NOT NULL,
    actor text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payload jsonb,
    "shiftId" integer,
    "reasonCode" text,
    "timeCategory" text
);


--
-- Name: ProductionOperationEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductionOperationEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ProductionOperationEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductionOperationEvent_id_seq" OWNED BY public."ProductionOperationEvent".id;


--
-- Name: ProductionRun; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionRun" (
    id text NOT NULL,
    "legacyRecordId" text,
    "orderId" integer,
    "orderNumber" character varying(20),
    "batchNumber" text,
    "batchName" text,
    "batchCreatedBy" text,
    "batchSource" text,
    "productId" text NOT NULL,
    "productCode" text NOT NULL,
    "productName" text NOT NULL,
    quantity integer NOT NULL,
    "totalQuantity" integer,
    "launchedQuantity" integer,
    status text DEFAULT 'draft'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    "priorityRank" integer,
    operator text,
    comment text,
    archived boolean DEFAULT false NOT NULL,
    "testData" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductionRunRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionRunRecord" (
    id text NOT NULL,
    "orderId" integer,
    "orderNumber" character varying(20),
    "productId" text,
    "productCode" text,
    "productName" text,
    quantity integer,
    status text,
    priority text,
    operator text,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    data jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductionUnit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionUnit" (
    id text NOT NULL,
    "runId" text NOT NULL,
    "unitNo" integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    progress double precision DEFAULT 0 NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductionUnitOperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductionUnitOperation" (
    id text NOT NULL,
    "runId" text NOT NULL,
    "unitId" text,
    "operationId" text NOT NULL,
    sequence integer NOT NULL,
    level integer,
    "partOrAssembly" text NOT NULL,
    name text NOT NULL,
    section text NOT NULL,
    "previousOperationCodes" text[],
    "nextOperationCodes" text[],
    "normHours" double precision NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    "priorityRank" integer,
    "lockedBy" text,
    "lockedAt" timestamp(3) without time zone,
    "lockReason" text,
    "lockToken" text,
    "lockTerminalId" text,
    "lockClientId" text,
    "lockExpiresAt" timestamp(3) without time zone,
    "lockVersion" integer DEFAULT 0 NOT NULL,
    "selectedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "pausedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "actualHours" double precision DEFAULT 0 NOT NULL,
    "shiftId" integer,
    "pauseReasonCode" text,
    "deviationReasonCode" text,
    "timeCategory" text,
    "acceptedQty" integer DEFAULT 0 NOT NULL,
    "defectQty" integer DEFAULT 0 NOT NULL,
    "reworkQty" integer DEFAULT 0 NOT NULL,
    "qualityStatus" text,
    "groupCapable" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: QualityRecord; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."QualityRecord" (
    id integer NOT NULL,
    "orderOperationId" integer NOT NULL,
    "orderId" integer NOT NULL,
    "personId" integer,
    "checkedQty" integer DEFAULT 0 NOT NULL,
    "acceptedQty" integer DEFAULT 0 NOT NULL,
    "defectQty" integer DEFAULT 0 NOT NULL,
    "reworkQty" integer DEFAULT 0 NOT NULL,
    "defectReason" text,
    "reasonCode" text,
    "responsibleOperationCode" text,
    inspector text,
    status text DEFAULT 'recorded'::text NOT NULL,
    comment text,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: QualityRecord_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."QualityRecord_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: QualityRecord_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."QualityRecord_id_seq" OWNED BY public."QualityRecord".id;


--
-- Name: ReferenceOperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferenceOperation" (
    id integer NOT NULL,
    "operationCode" text NOT NULL,
    name text NOT NULL,
    "defaultSection" text,
    "defaultNormHours" double precision,
    "partOrAssembly" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReferenceOperation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ReferenceOperation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ReferenceOperation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ReferenceOperation_id_seq" OWNED BY public."ReferenceOperation".id;


--
-- Name: ReferenceSection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ReferenceSection" (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ReferenceSection_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ReferenceSection_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ReferenceSection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ReferenceSection_id_seq" OWNED BY public."ReferenceSection".id;


--
-- Name: RouteOperation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RouteOperation" (
    id integer NOT NULL,
    "routeTemplateId" integer NOT NULL,
    "operationCode" text NOT NULL,
    flow text NOT NULL,
    name text NOT NULL,
    section text NOT NULL,
    "normHours" double precision NOT NULL,
    "previousOperationCodes" text[],
    "nextOperationCodes" text[],
    "sortOrder" integer NOT NULL
);


--
-- Name: RouteOperation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RouteOperation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RouteOperation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RouteOperation_id_seq" OWNED BY public."RouteOperation".id;


--
-- Name: RouteTemplate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RouteTemplate" (
    id integer NOT NULL,
    "productCode" text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: RouteTemplate_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RouteTemplate_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RouteTemplate_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RouteTemplate_id_seq" OWNED BY public."RouteTemplate".id;


--
-- Name: SectionCapacity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SectionCapacity" (
    id integer NOT NULL,
    section text NOT NULL,
    "availableHours" double precision NOT NULL,
    "weldHours" double precision,
    period text DEFAULT 'month'::text NOT NULL
);


--
-- Name: SectionCapacity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SectionCapacity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SectionCapacity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SectionCapacity_id_seq" OWNED BY public."SectionCapacity".id;


--
-- Name: TimeTracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TimeTracking" (
    id integer NOT NULL,
    "orderOperationId" integer NOT NULL,
    "orderId" integer NOT NULL,
    "personId" integer,
    kind text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "durationMinutes" integer,
    comment text,
    "reasonCode" text,
    "timeCategory" text,
    "shiftId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TimeTracking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TimeTracking_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TimeTracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TimeTracking_id_seq" OWNED BY public."TimeTracking".id;


--
-- Name: WorkCenter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkCenter" (
    id integer NOT NULL,
    section text NOT NULL,
    name text NOT NULL,
    "capacityHours" double precision DEFAULT 8 NOT NULL,
    "workType" text,
    "masterPersonId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WorkCenter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."WorkCenter_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WorkCenter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WorkCenter_id_seq" OWNED BY public."WorkCenter".id;


--
-- Name: WorkShift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkShift" (
    id integer NOT NULL,
    "shiftDate" timestamp(3) without time zone NOT NULL,
    section text NOT NULL,
    "workCenterId" integer,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    brigade text,
    master text,
    status text DEFAULT 'open'::text NOT NULL,
    "closedAt" timestamp(3) without time zone,
    "closedBy" text,
    "closeComment" text,
    "disputedJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WorkShift_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."WorkShift_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WorkShift_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WorkShift_id_seq" OWNED BY public."WorkShift".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: AppUser id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppUser" ALTER COLUMN id SET DEFAULT nextval('public."AppUser_id_seq"'::regclass);


--
-- Name: AuditLog id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog" ALTER COLUMN id SET DEFAULT nextval('public."AuditLog_id_seq"'::regclass);


--
-- Name: ImportBatch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportBatch" ALTER COLUMN id SET DEFAULT nextval('public."ImportBatch_id_seq"'::regclass);


--
-- Name: OperationEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationEvent" ALTER COLUMN id SET DEFAULT nextval('public."OperationEvent_id_seq"'::regclass);


--
-- Name: Order id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order" ALTER COLUMN id SET DEFAULT nextval('public."Order_id_seq"'::regclass);


--
-- Name: OrderOperation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderOperation" ALTER COLUMN id SET DEFAULT nextval('public."OrderOperation_id_seq"'::regclass);


--
-- Name: Person id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person" ALTER COLUMN id SET DEFAULT nextval('public."Person_id_seq"'::regclass);


--
-- Name: ProductionCalendarDay id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionCalendarDay" ALTER COLUMN id SET DEFAULT nextval('public."ProductionCalendarDay_id_seq"'::regclass);


--
-- Name: ProductionOperationEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent" ALTER COLUMN id SET DEFAULT nextval('public."ProductionOperationEvent_id_seq"'::regclass);


--
-- Name: QualityRecord id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityRecord" ALTER COLUMN id SET DEFAULT nextval('public."QualityRecord_id_seq"'::regclass);


--
-- Name: ReferenceOperation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferenceOperation" ALTER COLUMN id SET DEFAULT nextval('public."ReferenceOperation_id_seq"'::regclass);


--
-- Name: ReferenceSection id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferenceSection" ALTER COLUMN id SET DEFAULT nextval('public."ReferenceSection_id_seq"'::regclass);


--
-- Name: RouteOperation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RouteOperation" ALTER COLUMN id SET DEFAULT nextval('public."RouteOperation_id_seq"'::regclass);


--
-- Name: RouteTemplate id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RouteTemplate" ALTER COLUMN id SET DEFAULT nextval('public."RouteTemplate_id_seq"'::regclass);


--
-- Name: SectionCapacity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SectionCapacity" ALTER COLUMN id SET DEFAULT nextval('public."SectionCapacity_id_seq"'::regclass);


--
-- Name: TimeTracking id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking" ALTER COLUMN id SET DEFAULT nextval('public."TimeTracking_id_seq"'::regclass);


--
-- Name: WorkCenter id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkCenter" ALTER COLUMN id SET DEFAULT nextval('public."WorkCenter_id_seq"'::regclass);


--
-- Name: WorkShift id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkShift" ALTER COLUMN id SET DEFAULT nextval('public."WorkShift_id_seq"'::regclass);


--
-- Name: AppUser AppUser_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppUser"
    ADD CONSTRAINT "AppUser_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: DeviationReason DeviationReason_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviationReason"
    ADD CONSTRAINT "DeviationReason_pkey" PRIMARY KEY (code);


--
-- Name: ImportBatch ImportBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ImportBatch"
    ADD CONSTRAINT "ImportBatch_pkey" PRIMARY KEY (id);


--
-- Name: NomenclatureProcessRecord NomenclatureProcessRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NomenclatureProcessRecord"
    ADD CONSTRAINT "NomenclatureProcessRecord_pkey" PRIMARY KEY (id);


--
-- Name: OperationEvent OperationEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationEvent"
    ADD CONSTRAINT "OperationEvent_pkey" PRIMARY KEY (id);


--
-- Name: OrderOperation OrderOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderOperation"
    ADD CONSTRAINT "OrderOperation_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Person Person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Person"
    ADD CONSTRAINT "Person_pkey" PRIMARY KEY (id);


--
-- Name: ProductionCalendarDay ProductionCalendarDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionCalendarDay"
    ADD CONSTRAINT "ProductionCalendarDay_pkey" PRIMARY KEY (id);


--
-- Name: ProductionOperationEvent ProductionOperationEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent"
    ADD CONSTRAINT "ProductionOperationEvent_pkey" PRIMARY KEY (id);


--
-- Name: ProductionRunRecord ProductionRunRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionRunRecord"
    ADD CONSTRAINT "ProductionRunRecord_pkey" PRIMARY KEY (id);


--
-- Name: ProductionRun ProductionRun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionRun"
    ADD CONSTRAINT "ProductionRun_pkey" PRIMARY KEY (id);


--
-- Name: ProductionUnitOperation ProductionUnitOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnitOperation"
    ADD CONSTRAINT "ProductionUnitOperation_pkey" PRIMARY KEY (id);


--
-- Name: ProductionUnit ProductionUnit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnit"
    ADD CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY (id);


--
-- Name: QualityRecord QualityRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityRecord"
    ADD CONSTRAINT "QualityRecord_pkey" PRIMARY KEY (id);


--
-- Name: ReferenceOperation ReferenceOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferenceOperation"
    ADD CONSTRAINT "ReferenceOperation_pkey" PRIMARY KEY (id);


--
-- Name: ReferenceSection ReferenceSection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ReferenceSection"
    ADD CONSTRAINT "ReferenceSection_pkey" PRIMARY KEY (id);


--
-- Name: RouteOperation RouteOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RouteOperation"
    ADD CONSTRAINT "RouteOperation_pkey" PRIMARY KEY (id);


--
-- Name: RouteTemplate RouteTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RouteTemplate"
    ADD CONSTRAINT "RouteTemplate_pkey" PRIMARY KEY (id);


--
-- Name: SectionCapacity SectionCapacity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SectionCapacity"
    ADD CONSTRAINT "SectionCapacity_pkey" PRIMARY KEY (id);


--
-- Name: TimeTracking TimeTracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking"
    ADD CONSTRAINT "TimeTracking_pkey" PRIMARY KEY (id);


--
-- Name: WorkCenter WorkCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkCenter"
    ADD CONSTRAINT "WorkCenter_pkey" PRIMARY KEY (id);


--
-- Name: WorkShift WorkShift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkShift"
    ADD CONSTRAINT "WorkShift_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AppUser_login_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AppUser_login_key" ON public."AppUser" USING btree (login);


--
-- Name: AppUser_terminalQrToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AppUser_terminalQrToken_key" ON public."AppUser" USING btree ("terminalQrToken");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: DeviationReason_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviationReason_category_idx" ON public."DeviationReason" USING btree (category);


--
-- Name: DeviationReason_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviationReason_isActive_idx" ON public."DeviationReason" USING btree ("isActive");


--
-- Name: DeviationReason_timeCategory_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DeviationReason_timeCategory_idx" ON public."DeviationReason" USING btree ("timeCategory");


--
-- Name: NomenclatureProcessRecord_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NomenclatureProcessRecord_category_idx" ON public."NomenclatureProcessRecord" USING btree (category);


--
-- Name: NomenclatureProcessRecord_productCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NomenclatureProcessRecord_productCode_idx" ON public."NomenclatureProcessRecord" USING btree ("productCode");


--
-- Name: OrderOperation_orderId_operationCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderOperation_orderId_operationCode_key" ON public."OrderOperation" USING btree ("orderId", "operationCode");


--
-- Name: Order_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_orderNumber_key" ON public."Order" USING btree ("orderNumber");


--
-- Name: ProductionCalendarDay_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionCalendarDay_date_key" ON public."ProductionCalendarDay" USING btree (date);


--
-- Name: ProductionOperationEvent_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_eventType_idx" ON public."ProductionOperationEvent" USING btree ("eventType");


--
-- Name: ProductionOperationEvent_operationPk_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_operationPk_idx" ON public."ProductionOperationEvent" USING btree ("operationPk");


--
-- Name: ProductionOperationEvent_reasonCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_reasonCode_idx" ON public."ProductionOperationEvent" USING btree ("reasonCode");


--
-- Name: ProductionOperationEvent_runId_eventType_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_runId_eventType_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("runId", "eventType", "timestamp");


--
-- Name: ProductionOperationEvent_runId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_runId_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("runId", "timestamp");


--
-- Name: ProductionOperationEvent_shiftId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_shiftId_idx" ON public."ProductionOperationEvent" USING btree ("shiftId");


--
-- Name: ProductionOperationEvent_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("timestamp");


--
-- Name: ProductionOperationEvent_unitId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_unitId_idx" ON public."ProductionOperationEvent" USING btree ("unitId");


--
-- Name: ProductionOperationEvent_unitId_timestamp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionOperationEvent_unitId_timestamp_idx" ON public."ProductionOperationEvent" USING btree ("unitId", "timestamp");


--
-- Name: ProductionRunRecord_orderNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRunRecord_orderNumber_idx" ON public."ProductionRunRecord" USING btree ("orderNumber");


--
-- Name: ProductionRunRecord_productCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRunRecord_productCode_idx" ON public."ProductionRunRecord" USING btree ("productCode");


--
-- Name: ProductionRunRecord_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRunRecord_status_idx" ON public."ProductionRunRecord" USING btree (status);


--
-- Name: ProductionRun_archived_testData_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRun_archived_testData_status_idx" ON public."ProductionRun" USING btree (archived, "testData", status);


--
-- Name: ProductionRun_orderId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRun_orderId_status_idx" ON public."ProductionRun" USING btree ("orderId", status);


--
-- Name: ProductionRun_orderNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRun_orderNumber_idx" ON public."ProductionRun" USING btree ("orderNumber");


--
-- Name: ProductionRun_productCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRun_productCode_idx" ON public."ProductionRun" USING btree ("productCode");


--
-- Name: ProductionRun_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionRun_status_idx" ON public."ProductionRun" USING btree (status);


--
-- Name: ProductionUnitOperation_deviationReasonCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_deviationReasonCode_idx" ON public."ProductionUnitOperation" USING btree ("deviationReasonCode");


--
-- Name: ProductionUnitOperation_lockExpiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_lockExpiresAt_idx" ON public."ProductionUnitOperation" USING btree ("lockExpiresAt");


--
-- Name: ProductionUnitOperation_lockToken_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_lockToken_idx" ON public."ProductionUnitOperation" USING btree ("lockToken");


--
-- Name: ProductionUnitOperation_operationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_operationId_status_idx" ON public."ProductionUnitOperation" USING btree ("operationId", status);


--
-- Name: ProductionUnitOperation_pauseReasonCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_pauseReasonCode_idx" ON public."ProductionUnitOperation" USING btree ("pauseReasonCode");


--
-- Name: ProductionUnitOperation_runId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_runId_status_idx" ON public."ProductionUnitOperation" USING btree ("runId", status);


--
-- Name: ProductionUnitOperation_runId_unitId_operationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionUnitOperation_runId_unitId_operationId_key" ON public."ProductionUnitOperation" USING btree ("runId", "unitId", "operationId");


--
-- Name: ProductionUnitOperation_runId_unitId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_runId_unitId_status_idx" ON public."ProductionUnitOperation" USING btree ("runId", "unitId", status);


--
-- Name: ProductionUnitOperation_section_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_section_status_idx" ON public."ProductionUnitOperation" USING btree (section, status);


--
-- Name: ProductionUnitOperation_section_status_lockExpiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_section_status_lockExpiresAt_idx" ON public."ProductionUnitOperation" USING btree (section, status, "lockExpiresAt");


--
-- Name: ProductionUnitOperation_section_status_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_section_status_updatedAt_idx" ON public."ProductionUnitOperation" USING btree (section, status, "updatedAt");


--
-- Name: ProductionUnitOperation_shiftId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_shiftId_idx" ON public."ProductionUnitOperation" USING btree ("shiftId");


--
-- Name: ProductionUnitOperation_unitId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnitOperation_unitId_status_idx" ON public."ProductionUnitOperation" USING btree ("unitId", status);


--
-- Name: ProductionUnit_runId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnit_runId_status_idx" ON public."ProductionUnit" USING btree ("runId", status);


--
-- Name: ProductionUnit_runId_unitNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductionUnit_runId_unitNo_key" ON public."ProductionUnit" USING btree ("runId", "unitNo");


--
-- Name: ProductionUnit_status_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductionUnit_status_updatedAt_idx" ON public."ProductionUnit" USING btree (status, "updatedAt");


--
-- Name: QualityRecord_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityRecord_orderId_idx" ON public."QualityRecord" USING btree ("orderId");


--
-- Name: QualityRecord_orderOperationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityRecord_orderOperationId_idx" ON public."QualityRecord" USING btree ("orderOperationId");


--
-- Name: QualityRecord_reasonCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "QualityRecord_reasonCode_idx" ON public."QualityRecord" USING btree ("reasonCode");


--
-- Name: ReferenceOperation_defaultSection_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ReferenceOperation_defaultSection_idx" ON public."ReferenceOperation" USING btree ("defaultSection");


--
-- Name: ReferenceOperation_operationCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReferenceOperation_operationCode_key" ON public."ReferenceOperation" USING btree ("operationCode");


--
-- Name: ReferenceSection_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ReferenceSection_name_key" ON public."ReferenceSection" USING btree (name);


--
-- Name: RouteOperation_routeTemplateId_operationCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RouteOperation_routeTemplateId_operationCode_key" ON public."RouteOperation" USING btree ("routeTemplateId", "operationCode");


--
-- Name: RouteTemplate_productCode_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RouteTemplate_productCode_version_key" ON public."RouteTemplate" USING btree ("productCode", version);


--
-- Name: SectionCapacity_section_period_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SectionCapacity_section_period_key" ON public."SectionCapacity" USING btree (section, period);


--
-- Name: TimeTracking_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeTracking_orderId_idx" ON public."TimeTracking" USING btree ("orderId");


--
-- Name: TimeTracking_orderOperationId_kind_endedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeTracking_orderOperationId_kind_endedAt_idx" ON public."TimeTracking" USING btree ("orderOperationId", kind, "endedAt");


--
-- Name: TimeTracking_reasonCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeTracking_reasonCode_idx" ON public."TimeTracking" USING btree ("reasonCode");


--
-- Name: TimeTracking_shiftId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TimeTracking_shiftId_idx" ON public."TimeTracking" USING btree ("shiftId");


--
-- Name: WorkCenter_masterPersonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkCenter_masterPersonId_idx" ON public."WorkCenter" USING btree ("masterPersonId");


--
-- Name: WorkCenter_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkCenter_section_idx" ON public."WorkCenter" USING btree (section);


--
-- Name: WorkCenter_section_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkCenter_section_name_key" ON public."WorkCenter" USING btree (section, name);


--
-- Name: WorkShift_section_startsAt_endsAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkShift_section_startsAt_endsAt_idx" ON public."WorkShift" USING btree (section, "startsAt", "endsAt");


--
-- Name: WorkShift_shiftDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkShift_shiftDate_idx" ON public."WorkShift" USING btree ("shiftDate");


--
-- Name: WorkShift_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkShift_status_idx" ON public."WorkShift" USING btree (status);


--
-- Name: AppUser AppUser_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AppUser"
    ADD CONSTRAINT "AppUser_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OperationEvent OperationEvent_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationEvent"
    ADD CONSTRAINT "OperationEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OperationEvent OperationEvent_orderOperationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationEvent"
    ADD CONSTRAINT "OperationEvent_orderOperationId_fkey" FOREIGN KEY ("orderOperationId") REFERENCES public."OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OperationEvent OperationEvent_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OperationEvent"
    ADD CONSTRAINT "OperationEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderOperation OrderOperation_assignedPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderOperation"
    ADD CONSTRAINT "OrderOperation_assignedPersonId_fkey" FOREIGN KEY ("assignedPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderOperation OrderOperation_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderOperation"
    ADD CONSTRAINT "OrderOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionOperationEvent ProductionOperationEvent_operationPk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent"
    ADD CONSTRAINT "ProductionOperationEvent_operationPk_fkey" FOREIGN KEY ("operationPk") REFERENCES public."ProductionUnitOperation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionOperationEvent ProductionOperationEvent_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent"
    ADD CONSTRAINT "ProductionOperationEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionOperationEvent ProductionOperationEvent_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent"
    ADD CONSTRAINT "ProductionOperationEvent_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionOperationEvent ProductionOperationEvent_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionOperationEvent"
    ADD CONSTRAINT "ProductionOperationEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."ProductionUnit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionUnitOperation ProductionUnitOperation_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnitOperation"
    ADD CONSTRAINT "ProductionUnitOperation_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionUnitOperation ProductionUnitOperation_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnitOperation"
    ADD CONSTRAINT "ProductionUnitOperation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionUnitOperation ProductionUnitOperation_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnitOperation"
    ADD CONSTRAINT "ProductionUnitOperation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."ProductionUnit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionUnit ProductionUnit_runId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductionUnit"
    ADD CONSTRAINT "ProductionUnit_runId_fkey" FOREIGN KEY ("runId") REFERENCES public."ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QualityRecord QualityRecord_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityRecord"
    ADD CONSTRAINT "QualityRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QualityRecord QualityRecord_orderOperationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityRecord"
    ADD CONSTRAINT "QualityRecord_orderOperationId_fkey" FOREIGN KEY ("orderOperationId") REFERENCES public."OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QualityRecord QualityRecord_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."QualityRecord"
    ADD CONSTRAINT "QualityRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RouteOperation RouteOperation_routeTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RouteOperation"
    ADD CONSTRAINT "RouteOperation_routeTemplateId_fkey" FOREIGN KEY ("routeTemplateId") REFERENCES public."RouteTemplate"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeTracking TimeTracking_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking"
    ADD CONSTRAINT "TimeTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeTracking TimeTracking_orderOperationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking"
    ADD CONSTRAINT "TimeTracking_orderOperationId_fkey" FOREIGN KEY ("orderOperationId") REFERENCES public."OrderOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimeTracking TimeTracking_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking"
    ADD CONSTRAINT "TimeTracking_personId_fkey" FOREIGN KEY ("personId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimeTracking TimeTracking_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TimeTracking"
    ADD CONSTRAINT "TimeTracking_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public."WorkShift"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkCenter WorkCenter_masterPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkCenter"
    ADD CONSTRAINT "WorkCenter_masterPersonId_fkey" FOREIGN KEY ("masterPersonId") REFERENCES public."Person"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: WorkCenter WorkCenter_section_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkCenter"
    ADD CONSTRAINT "WorkCenter_section_fkey" FOREIGN KEY (section) REFERENCES public."ReferenceSection"(name) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: WorkShift WorkShift_workCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkShift"
    ADD CONSTRAINT "WorkShift_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES public."WorkCenter"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict zgdJBTYxawmmDFEBAMCpwVCLszhUfBBjQ0QzHAqkazRLL9Et9s8OOXGWs2VGmQT

