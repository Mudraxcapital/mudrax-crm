# Business Requirements Document (BRD)

## Mudrax Capitals — Enterprise CRM

| Document Control | Detail |
| --- | --- |
| **Document Title** | Business Requirements Document — Mudrax Capitals Enterprise CRM |
| **Organization** | Mudrax Capitals / Mudrax Capital Solutions Pvt Ltd |
| **Product** | Production-grade Enterprise CRM (Loan DSA operations) |
| **Document Type** | Business Requirements Document (BRD) |
| **Version** | 1.0 |
| **Status** | Draft — pending stakeholder sign-off |
| **Prepared By** | Business Analysis (requirements interview) |
| **Primary Stakeholder** | Admin / Business Owner (Mudrax Capitals) |
| **Deployment Target** | Company-owned Linux server; daily employee use |
| **Related Current System** | TeleCRM (nex.telecrm) — reference baseline and replacement target |

---

## 1. Executive Summary

Mudrax Capitals is a **Loan DSA (Direct Selling Agent)** company. The organization currently runs telecalling and lead operations on **TeleCRM**. This BRD defines the business requirements for a **new production-grade Enterprise CRM** to be hosted on the company’s own Linux server and used daily by Admin, Managers, Team Leaders, and Callers.

The new CRM must support:

- Bulk Excel lead upload with duplicate and past-case handling
- Campaign-based lead organization and caller assignment (equal / percentage split)
- Click-to-call via **PRI lines** (SIM-based), with **call recording**
- Configurable lead stages / dispositions and call-feedback statuses
- Follow-up and Call Later scheduling with reminders and escalation
- WhatsApp and Email offer outreach with inbound “I am interested” capture
- API lead capture from Facebook, Website, WhatsApp, and Google Ads
- Role-based hierarchy, performance reports, and leaderboards
- Fresh go-live (no TeleCRM data migration)

**Out of day-one scope (explicitly deferred or declined):** bank login / approval / disbursement tracking inside CRM; SMS outreach; Add Single Lead; star/lead rating; marketplace integrations (99acres, IndiaMart, JustDial, etc.); TeleCRM data migration; auto-dialer and mobile app (future).

---

## 2. Business Context

### 2.1 Company Profile

| Item | Description |
| --- | --- |
| **Company** | Mudrax Capitals (Mudrax Capital Solutions Pvt Ltd) |
| **Business Model** | Loan DSA — originates and processes loan leads for banks / lenders |
| **Primary Operating Model** | Telecalling campaigns on purchased and digital leads |
| **Current Tool** | TeleCRM |
| **New System Nature** | Production enterprise software (not a college / demo project) |

### 2.2 Loan Products

| Product | Notes |
| --- | --- |
| New Car Loan | Calling process same; pitch differs |
| Used Car Loan | Calling process same; pitch differs |
| Home Loan | Calling process same; pitch differs |
| LAP (Loan Against Property) | Calling process same; pitch differs |
| Personal Loan | Calling process same; pitch differs |
| Business Loan | Calling process same; pitch differs |
| BT Top-up (Balance Transfer Top-up) | Calling process same; pitch differs |

**Business rule:** Product does **not** change the calling workflow. Only the **caller pitch** changes by product.

### 2.3 Business Objectives

| Objective | Description |
| --- | --- |
| Replace / improve on TeleCRM | Retain proven tele-CRM patterns; fix known gaps |
| Own the platform | Deploy and operate on company Linux server |
| Improve campaign assignment | New callers added at upload must auto-map to campaign without error workarounds |
| Improve non-contact outreach | Predefined WhatsApp and Email loan offers with interest reply capture |
| Improve governance | Clear Admin → Manager → Team Leader → Caller hierarchy and visibility |
| Improve productivity visibility | Leaderboards, call reports, disposition reports, date/hour/week/month views |

### 2.4 Success Criteria (Business)

| # | Success Criterion |
| --- | --- |
| 1 | Callers can work daily from campaign lead queues with click-to-call and dispositions |
| 2 | Admin/Manager can upload Excel, handle duplicates/past cases, assign campaigns with % split |
| 3 | Digital leads from Facebook, Website, WhatsApp, Google Ads land in CRM automatically |
| 4 | Follow-up and Call Later reminders and missed-call escalations work as defined |
| 5 | Team Leaders/Managers/Admin can review performance, listen to recordings, and run reports |
| 6 | System is stable for production volumes (TeleCRM currently holds hundreds of thousands of leads) |

---

## 3. Scope

### 3.1 In Scope (Day One)

| Area | In Scope |
| --- | --- |
| User hierarchy & permissions | Admin, Manager, Team Leader, Caller |
| Lead fields (configurable) | As per current TeleCRM field model / extensible |
| Excel bulk upload | Including 1-row or multi-row files |
| Duplicate & past-case handling | Phone-based |
| Campaigns | Create, name, map callers, upload into campaign |
| Lead assignment | Manual caller selection + equal / percentage split |
| Caller workspace | Lead list, detail, call, dispositions, optional notes |
| Call Later & Follow-up | Separate; both with date/time + escalation |
| Interested handling | Alerts to TL/Manager |
| Won definition | Documents collected |
| Lost reasons | Configurable |
| Call feedback statuses | Configurable (TeleCRM-like) |
| Click-to-call | PRI + SIM auto-selection |
| Call recording | Required; listen rights by role |
| WhatsApp | Lead capture + offer send + interest reply |
| Email | Lead capture + offer send + interest reply |
| Lead source APIs | Facebook, Website/API, WhatsApp, Google Ads |
| Reports & leaderboard | Call, status, lost reason, productivity |
| Saved lead views / filters | Active, Assigned to Me, Unassigned, Incoming WhatsApp, etc. |
| Go-live approach | Fresh start |

### 3.2 Out of Scope (Day One)

| Area | Status | Notes |
| --- | --- | --- |
| Bank selection / login / under-process / approved / rejected / disbursed tracking in CRM | **Not required** | Stakeholder deferred |
| Document vault / document checklist marking by caller | **Not required as caller task** | TL/Manager track documents operationally; caller need not mark document status |
| SMS sending | **Not required** | WhatsApp + Email enough |
| Add Single Lead (manual form) | **Not required** | Excel only |
| Star / lead rating / Lead-IQ style scoring | **Not required** | |
| TeleCRM historical migration | **Not required** | Fresh start |
| Marketplace integrations (99acres, Housing, IndiaMart, JustDial, etc.) | **Not required day one** | |
| Auto-dialer (predictive / power dialer beyond PRI click-to-call) | **Future** | |
| Mobile app | **Future** | |
| Attendance, incentives/payroll, multi-branch separation | **Not requested** | May be raised later |

### 3.3 Future Requirements

| Future Capability | Priority Intent |
| --- | --- |
| Auto-dialer | Required in future (6–12 months horizon stated) |
| Mobile app | Required in future |

---

## 4. Stakeholders & User Roles

### 4.1 Role Hierarchy

```
Admin
 └── Manager(s)
      └── Team Leader(s)
           └── Caller(s)
```

| Role | Position in Hierarchy |
| --- | --- |
| **Admin** | Top; sole overall in-charge of the CRM |
| **Manager** | Under Admin; owns team leaders and callers in their span |
| **Team Leader** | Under Manager; owns callers in their team |
| **Caller** | Lowest operational role; works assigned portfolio only |

### 4.2 Role Responsibilities & Permissions

#### 4.2.1 Admin

| Capability | Allowed |
| --- | --- |
| Full rights over software | Yes |
| Add / delete Manager | Yes |
| Add / delete Team Leader | Yes |
| Add / delete Caller | Yes |
| Map multiple Managers under Admin | Yes |
| Map Team Leaders under a Manager | Yes |
| Map Callers under a Team Leader | Yes |
| Modify rights of Manager / Team Leader / Caller | Yes |
| Upload Excel data | Yes |
| Delete data | Yes |
| Map campaigns to callers; set split % | Yes |
| View performance of every Manager, Team Leader, Caller | Yes |
| Access all reports | Yes |
| Listen to call recordings | Yes |
| See WhatsApp/Email interest volumes and related alerts | Yes |

#### 4.2.2 Manager

| Capability | Allowed |
| --- | --- |
| Upload data (Excel and various sources / integrations) | Yes |
| Add / delete Callers | Yes |
| Review performance of Team Leaders and Callers in their team | Yes |
| View team reports | Yes |
| Listen to call recordings | Yes |
| Reassign follow-ups / leads (e.g. caller absent) | Yes |
| Receive alerts (interested, missed follow-up / call later) | Yes |
| See caller notes | Yes |
| Delete Team Leaders (as Admin does) | Not stated as Manager right — Admin function |
| Upload-only restriction | Managers **can** upload (unlike Team Leaders) |

#### 4.2.3 Team Leader

| Capability | Allowed |
| --- | --- |
| Review team performance | Yes |
| See number of calls / calls per hour | Yes |
| Listen to call recordings | Yes |
| Receive next-day alerts for missed follow-ups / call later | Yes |
| Receive interested alerts | Yes |
| Reassign follow-ups / leads to other callers | Yes |
| Ensure documents collected; decide ready for bank login (operational) | Yes (outside detailed CRM bank module) |
| Add / delete Callers | **No** |
| Upload data themselves | **No** |
| See caller notes | Yes |

#### 4.2.4 Caller

| Capability | Allowed |
| --- | --- |
| Call on assigned leads only | Yes |
| Click-to-call from lead screen | Yes |
| Set disposition / lead stage codes | Yes |
| Set call feedback statuses | Yes |
| Mark Follow-up / Call Later with date-time | Yes |
| Optional Add Note | Yes (not mandatory) |
| Send predefined WhatsApp / Email offer | Yes |
| View own performance (calls, connectivity, connected, follow-ups) | Yes |
| Revisit ringing / lost / switch-off / own buckets | Yes |
| Upload data | **No** |
| View other callers’ performance | **No** |
| Work outside assigned portfolio | **No** |

---

## 5. Current State (TeleCRM Reference)

TeleCRM is considered **generally good**. The new CRM should treat TeleCRM as a **functional baseline**, plus the improvements and exclusions defined in this BRD.

### 5.1 Observed TeleCRM Capabilities to Mirror (Business Level)

| Area | Observed Behavior |
| --- | --- |
| Fields Settings | Configurable lead fields; Phone as Lead Id; H1 Name, H2 Phone |
| Lead Stages | Initial (Fresh default), Active stages, Closed Won, Closed Lost + lost reasons; stages addable |
| Call Feedback | Statuses with default Connected when call duration > 0 |
| Workspace | Country +91 India, Asia/Kolkata, INR; Campaigns on; Lead Stage on leaderboard |
| Users | User management; permission templates (Root, Admin, Manager, Caller, Marketing) |
| Dashboard widgets | Follow-ups (Upcoming/Late/Done/Cancel); Leads by stages; Filters |
| Search | Search by name, phone, email / details |
| Lead intake menu | Add Single Lead; Add From Excel; Add from integration |
| Import Leads | CSV/XLSX upload; sample download; upload history |
| Campaign dashboard | Campaign select; assignee pie chart; Active/New queues; detail pane actions |
| Lead actions | Call, Call Later, WhatsApp, SMS, Add Note |
| Activity history | Status changes, call duration, lead source |
| Lead views | All Active, All Leads, Assigned to Me, My Leads, Unassigned, Incoming WhatsApp |
| Reports | Leaderboard, Call Report, Report Download, Duplicate Leads |
| Integrations | Facebook + Website/API active; many others available |

### 5.2 Known Pain Points / Gaps vs TeleCRM

| # | Pain Point | Required Behavior in New CRM |
| --- | --- | --- |
| 1 | Adding a **new caller** while uploading into an **existing campaign** does not auto-map; error requires manual fix | Any callers selected at upload (including new to that campaign) must be **auto-added to the campaign** and receive data **immediately on upload** |
| 2 | No **email send** from TeleCRM for offers | Caller can send **predefined Email** offer when customer not contactable |
| 3 | Need stronger non-contact outreach | Caller can send **predefined WhatsApp** offer; customer can reply / tap **I am interested** |

### 5.3 Explicit TeleCRM Features Not Required

| Feature | Decision |
| --- | --- |
| SMS button / SMS send | Not required |
| Star rating | Not required |
| Add Single Lead | Not required (Excel covers single or multiple) |
| Marketplace integrations list | Not required day one |

---

## 6. End-to-End Business Workflow

### 6.1 Happy Path (Loan Case Journey)

| Step | Actor | Activity |
| --- | --- | --- |
| 1 | Admin / Manager | Upload leads via Excel (and/or receive API leads into campaigns) |
| 2 | System | Check duplicates by phone; handle past-case matches per upload choices |
| 3 | Admin / Manager | Assign / map campaign to selected callers; equal or % split |
| 4 | Caller | Calls leads from assigned portfolio (click-to-call via PRI) |
| 5 | Caller | Sets disposition / call feedback; may set Follow-up or Call Later; optional note |
| 6 | Caller | If interested path: mark **Interested**; collect documents via WhatsApp (customer sends on WhatsApp) |
| 7 | System | Alerts Team Leader and Manager on Interested |
| 8 | Team Leader / Manager | Track interested volume; ensure documents collected; mark case ready for bank login operationally |
| 9 | Team Leader (ops) | Case sent for bank login as per customer eligibility |
| 10 | Bank / ops outside CRM module | Approval and disbursement (bank stage tracking **not** required inside CRM day one) |
| 11 | Caller / System | Lead marked **Won** when **documents are collected** |

### 6.2 Non-Contact / Soft Interest Paths

| Scenario | Expected Behavior |
| --- | --- |
| Customer not contactable | Caller may send predefined **WhatsApp** and/or **Email** loan offer |
| Customer replies “I am interested” | Lead captured into CRM; shown on caller screen under WhatsApp/Email campaign; alerts to Caller, TL, Manager; Admin can see all |
| Customer busy now | **Call Later** + next date/time |
| Customer showing some interest (callback / nurture) | **Follow-up** + next date/time |

---

## 7. Lead Sources

### 7.1 Source Catalog

| Source | How Leads Enter | Day-One Required |
| --- | --- | --- |
| Purchased Excel lists (marketing companies) | Bulk Excel upload | Yes |
| Facebook Ads | Automatic via API / integration | Yes |
| Website | Automatic via Website/API | Yes |
| Google Ads | Automatic via API / integration | Yes |
| WhatsApp | Automatic via WhatsApp Business API (lead capture) | Yes |

### 7.2 Source Handling Rules

| Rule | Description |
| --- | --- |
| Campaign mapping | Excel leads map to self-created campaigns |
| Separate campaigns allowed | Facebook, Google, Website, WhatsApp leads may have separate campaigns |
| Campaign flexibility | Multiple campaigns with different names can be created whenever required |
| Caller mapping | Callers are assigned to campaigns for calling |

---

## 8. Campaigns & Lead Assignment

### 8.1 Campaign Rules

| Rule | Description |
| --- | --- |
| Creation | Users with rights (Admin/Manager per upload rights) create campaigns with custom names |
| Examples from current ops | e.g. HDFC June style campaigns, mid-ticket campaigns, location-bank named campaigns |
| Upload target | Fresh data uploaded into a selected campaign |
| Caller membership | Campaign is mapped to one or more callers |

### 8.2 Assignment & Split Rules

| Rule | Description |
| --- | --- |
| Who assigns | **Admin** or **Manager** |
| How callers are chosen | Manually by selecting / ticking caller names (caller IDs already created at joining) |
| Hierarchy context | Caller is already mapped to a Team Leader |
| Default split | If N callers selected for M leads, system **divides equally** |
| Custom split | Admin/Manager can change **percentage** per caller (e.g. 50% to one caller; remainder equal among others) |
| UI expectation | System shows percentages against each caller; editable before/at upload allocation |
| Critical fix vs TeleCRM | Selecting a caller **new to the campaign** must auto-add them to the campaign and allocate data without requiring a post-error manual repair |

### 8.3 Reassignment

| Rule | Description |
| --- | --- |
| Who can reassign | Team Leader or Manager |
| What can be reassigned | Follow-ups and leads |
| Typical reason | Caller absent on a particular day |

---

## 9. Excel Upload, Duplicates & Past Cases

### 9.1 Upload Channel

| Item | Requirement |
| --- | --- |
| Format | Excel (aligned with TeleCRM CSV/XLSX practice) |
| Volume | Single lead or bulk — same upload path |
| Who can upload | Admin, Manager |
| Who cannot upload | Team Leader, Caller |
| Add Single Lead form | Not required |

### 9.2 Typical Excel / Lead Attributes (from current operations & TeleCRM fields)

Fields observed / stated (system should support configurable fields; at minimum business uses):

| Field | Notes |
| --- | --- |
| Name | Primary display (H1) |
| Phone | Primary identifier / Lead Id; duplicate key |
| Alternate Phone | Present in TeleCRM fields |
| Asset / Assets / Asset model | e.g. car model details |
| Car model / Car Model and Brand Name | Product-related |
| Manufacturing Year | Present in TeleCRM |
| Location / Current Location / City | Geography |
| Bank Name | Often present on purchased data |
| Company Name | Present in TeleCRM |
| CTC | Present in TeleCRM |
| Designation | Present in TeleCRM |
| deleted | Soft-delete style flag observed in TeleCRM |

Admin must be able to **add new fields** as required (TeleCRM Fields Settings pattern).

### 9.3 Duplicate Detection

| Rule | Description |
| --- | --- |
| Match key | **Phone number** |
| When | During Excel upload |

### 9.4 Past-Case Handling on Re-Upload

When uploaded phones match existing CRM leads:

| Capability | Description |
| --- | --- |
| Show matches by disposition | System shows how many matches fall under each disposition / stage (e.g. Fresh/pending, Ringing, Lost, Follow-up, Interested, and other caller-marked codes) |
| Selective delete by disposition | User can choose to delete only selected groups (e.g. only Ringing and Lost) |
| Delete all matched | Option to delete all matched old cases and upload as fresh |
| Ignore | Option to ignore matched old cases and skip uploading those rows |
| Reload as fresh | After delete choice, remaining/new rows upload as fresh leads |

---

## 10. Lead Stages, Dispositions & Call Feedback

### 10.1 Design Principle

Lead stages / disposition codes must be **manually configurable** (add / edit / delete / reorder as required), similar to TeleCRM “Configure Your Sales Pipeline.”

### 10.2 Stage Groups (Baseline from TeleCRM)

| Group | Stage / Item | Notes |
| --- | --- | --- |
| **Initial** | Fresh | Default for new leads |
| **Active (examples)** | Ringing | In use |
| | Just Curious | In use |
| | Interested | Triggers TL/Manager alerts |
| | Follow up | Scheduling + reminders |
| | *(+ Add more as needed)* | Configurable |
| **Closed – Won** | Won | When **documents are collected** |
| **Closed – Lost** | Lost | With sub-reasons |
| **Lost reasons (examples)** | No Need | |
| | Unable to Connect | |
| | Budget Issues | |
| | Product does not fit need | |
| | Lost to competitor | |
| | Unknown Reason | |
| | *(+ Add more; TeleCRM showed limit pattern e.g. 6/25)* | Configurable |

**Also used verbally in interview (may map to stages or call feedback):** not required, disconnected, switch off, ringing database revisit, lost cases revisit.

### 10.3 Call Feedback Statuses (Baseline from TeleCRM)

Separate from lead stages. Auto-default when call duration > 0 seconds (Connected), but can be updated anytime.

| Call Feedback Status | Notes |
| --- | --- |
| NUMBER BUSY | |
| NO ANSWER | |
| WRONG NUMBER | |
| SWITCHED OFF | |
| CONNECTED | Default when duration > 0 |
| CALL LATER | Related to Call Later action |
| REDIALED | |
| Archived statuses | Support archive pattern |

Statuses must be addable / manageable by Admin (or equivalent configuration rights).

### 10.4 Business Meaning of Key Outcomes

| Outcome | Business Meaning | System Behavior |
| --- | --- | --- |
| **Follow-up** | Customer showing some interest | Require next date & time; caller reminder same day when logged in; if missed that day, next day alert TL (and Manager per Call Later parity / interview) |
| **Call Later** | Customer busy now — call later | Separate from Follow-up; require next date & time; if missed, alert Team Leader and Manager |
| **Interested** | Customer interested in loan | Alert Team Leader and Manager; track daily interested counts |
| **Won** | Documents collected | Mark Won at document collection |
| **Lost** | Closed lost | Capture lost reason |

### 10.5 Documents (Business Process)

| Rule | Description |
| --- | --- |
| Channel | Customer sends documents on **WhatsApp** |
| Caller marking document checklist in CRM | **Not required** |
| Who ensures completeness | Team Leader or Manager |
| Ready for bank login | Decided by TL/Manager after documents complete |
| Bank login module in CRM | **Not required day one** |

---

## 11. Follow-up & Call Later — Detailed Rules

### 11.1 Follow-up

| Rule | Requirement |
| --- | --- |
| Trigger | Caller marks Follow-up |
| Mandatory inputs | Next **date** and **time** of call |
| Caller reminder | When caller is logged in, remind that person was supposed to be called **today** |
| Missed same day | If not called within the day, **next day** alert to **Team Leader** that listed customers are still pending |
| Reassignment | TL or Manager can reassign follow-up to another caller |

### 11.2 Call Later

| Rule | Requirement |
| --- | --- |
| Trigger | Customer says they are busy; call later |
| Distinction | Different from Follow-up (interest vs busy) |
| Mandatory inputs | Next **date** and/or **time** |
| Missed schedule | Alert to **Team Leader and Manager** |
| Reassignment | Covered under general lead/follow-up reassignment by TL/Manager |

### 11.3 Follow-up Dashboard Expectations (from TeleCRM)

Views such as Upcoming / Late / Done / Cancel by assignee and date filters are expected as part of tele-CRM reporting/operations.

---

## 12. Calling, Telephony & Recordings

### 12.1 Click-to-Call

| Item | Requirement |
| --- | --- |
| UI | Call button on lead when lead appears on caller screen |
| Connectivity | CRM integrated with **PRI lines** |
| SIMs | SIM cards placed in PRI |
| Routing | PRI automatically picks which SIM is used for the outbound call |
| Nature | Click-to-call; PRI-side automatic SIM selection (described by stakeholder as auto-dialing kind of feature of PRI line) |
| Future auto-dialer | Separate future requirement beyond day-one PRI click-to-call |

### 12.2 Call Recording

| Item | Requirement |
| --- | --- |
| Recording | **Required** |
| Who can listen | Admin, Manager, Team Leader (as per role rights stated) |
| Caller | Operates calls; listening rights for others as governance |

### 12.3 Connected Call Definition (from TeleCRM workspace)

| Setting | Current TeleCRM Reference |
| --- | --- |
| Connected Call Minimum Duration | 1 second (workspace setting pattern) |
| Default call feedback | Connected if duration > 0s |

New CRM should support equivalent business-configurable connected-call threshold behavior.

### 12.4 Caller Buckets / Revisit

Callers must be able to return to portfolios such as:

| Bucket / Filter Concept | Purpose |
| --- | --- |
| Ringing cases | Retry |
| Switch off cases | Retry |
| Lost cases | Review / possible revisit per process |
| Follow-ups due | Scheduled work |
| Call Later due | Scheduled work |

---

## 13. WhatsApp & Email Communications

### 13.1 Outbound Offers

| Channel | When Used | Behavior |
| --- | --- | --- |
| WhatsApp | Customer not contactable (and general offer send) | Caller clicks WhatsApp; **predefined loan offer message** sends from integrated WhatsApp number |
| Email | Customer not contactable (and offer send) | Caller clicks Send Email; **predefined email** goes to customer email ID **if provided in uploaded database** |

| Rule | Description |
| --- | --- |
| Content | Predefined offer templates (loan offer) |
| Caller choice | Caller chooses WhatsApp or Email (or either as needed) |
| SMS | Not required |

### 13.2 Inbound Interest Reply

| Rule | Description |
| --- | --- |
| Customer action | Reply message or hit button **“I am interested”** |
| Capture | CRM captures via API / integrated model |
| Caller visibility | Lead appears on caller screen in particular WhatsApp or Email campaign |
| Alerts | Caller, Team Leader, and Manager alerted that customer showed interest |
| Metrics | How many customers replied via WhatsApp or Email |
| Admin | Admin has rights to see everything by default |

### 13.3 WhatsApp for Documents

| Rule | Description |
| --- | --- |
| Documents | Customers send documents on WhatsApp window (operational channel) |
| CRM document status by caller | Not mandatory to mark |

---

## 14. Integrations (Day One)

| Integration | Purpose | Day-One |
| --- | --- | --- |
| **PRI telephony** | Click-to-call, SIM selection, call path | Must-have |
| **Call recording storage / access** | Record and listen | Must-have |
| **WhatsApp Business API** | Lead capture + send offers + interest replies | Must-have |
| **Email service** | Lead capture + send offers + interest replies | Must-have |
| **Facebook** | Lead capture (currently active in TeleCRM) | Must-have |
| **Website / API** | Lead capture (currently active in TeleCRM) | Must-have |
| **Google Ads** | Lead capture (additional required) | Must-have |
| SMS gateway | Outreach | **Not required** |
| 99acres / Housing / IndiaMart / JustDial / etc. | Lead portals | **Not required day one** |
| CallerDesk / other telephony SaaS | Optional in TeleCRM catalog | Day-one model is **PRI**, not mandated as CallerDesk |

---

## 15. Reports & Analytics

### 15.1 Consumers

| Role | Report Access |
| --- | --- |
| Admin | Entire CRM / all managers, TLs, callers |
| Manager | Own team leaders and callers |
| Team Leader | Own team / callers |
| Caller | Own performance only |

### 15.2 Required Report Types

| Report / View | Key Metrics / Behavior |
| --- | --- |
| **Leaderboard** | Top callers; calls; who is leading; Day / Week / Month / Year; search by teammember; team rollups (e.g. manager’s team) |
| **Caller drill-down** | On clicking caller: calls made, connected, ringing, switch off, follow-ups, etc. |
| **Call reports** | Volume, duration, connectivity |
| **Date-wise reports** | Select day(s) |
| **Hour-wise reports** | Productivity by hour |
| **Multi-day / Week / Month** | Flexible range |
| **Lead status reports** | Fresh, dialed, connected, ringing, lost, etc. |
| **Campaign calling report** | Per campaign (TeleCRM pattern) |
| **Leads status report** | Per campaign / overall |
| **Leads lost reason report** | Lost reason breakdown |
| **Calls status report** | Call feedback outcomes |
| **Duplicate leads report** | TeleCRM has this; useful with phone duplicate rules |
| **Follow-up views** | Upcoming / Late / Done / Cancel |
| **Interest channel metrics** | WhatsApp / Email interest replies |
| **General tele-CRM productivity reports** | Anything needed for Admin/Manager/TL to improve caller performance |

### 15.3 Leaderboard Reference Metrics (from TeleCRM)

| Metric | Example Use |
| --- | --- |
| Calls | Count |
| Duration | Total talk time |
| Sales | May show 0 in current ops; retain concept if useful later |
| Team size | For manager teams |
| First Call / Last Call | Caller day boundaries |

---

## 16. Lead Views, Search & Operational Screens (Business Expectations)

### 16.1 Lead List Views / Filters

| View | Purpose |
| --- | --- |
| All Active Leads | Active portfolio |
| All Leads | Full set |
| Leads Assigned To Me | Personal queue |
| My Leads | Personal set |
| Unassigned Leads | Needs assignment |
| All Incoming WhatsApp Leads | WhatsApp source queue |
| Campaign Active / New queues | Campaign calling |

Filters expected: Assignee, Status, Creation Date, search by name/phone/details; bulk edit pattern exists in TeleCRM (business may keep bulk operational edits for Admin/Manager).

### 16.2 Campaign Workspace (Caller / Supervisor)

Three-pane style business expectation:

| Pane | Content |
| --- | --- |
| Left | Campaign selector, stats, assignee distribution, report accordions |
| Middle | Lead cards/list with status badges and timestamps |
| Right | Lead detail: stage, assignee, fields, Call / Call Later / WhatsApp / Email (not SMS), Add Note, activity history, tasks |

### 16.3 Activity History

Must show business-relevant events such as:

| Event Type | Examples |
| --- | --- |
| Status changes | Fresh → Lost (No Need) |
| Calls | CONNECTED (duration) |
| Lead source | Excel CRM / integration source |
| Notes | Caller-entered notes visible to TL/Manager |
| Outreach | WhatsApp/Email offer sends and interest replies (expected) |

---

## 17. Non-Functional Business Requirements

| Area | Requirement |
| --- | --- |
| Deployment | Company-owned **Linux server** |
| Usage | Daily production use by employees |
| Locale | India operations; +91; Asia/Kolkata; INR |
| Scale | Must support large lead volumes (TeleCRM reference: 100k+ to 500k+ leads class of data) |
| Upload scale | TeleCRM reference: up to large Excel sheets (e.g. 100k rows/sheet class) — new CRM should support serious bulk uploads |
| Reliability | Production-grade; duplicate/upload flows must not fail on new campaign callers |
| Security / access | Strict role isolation (callers see only own portfolio/performance) |
| Auditability | Activity history for status, calls, notes, sources |
| Fresh cutover | No mandatory migration from TeleCRM |

---

## 18. Assumptions

| # | Assumption |
| --- | --- |
| 1 | Stakeholder will provide WhatsApp Business API, Email service, Facebook, Website API, Google Ads, and PRI connectivity credentials/config for go-live |
| 2 | “Bank login / disbursement” continues outside CRM day one; Won = documents collected remains the CRM commercial milestone |
| 3 | Pitch content by product may be managed operationally (scripts) even if a full script library was not requested as a module |
| 4 | Permission template concept (Admin/Manager/Caller/etc.) remains the business model for rights |
| 5 | Additional requirements may be added later by stakeholder (“if anything comes in mind will let you know”) |

---

## 19. Open Items / To Be Confirmed Later

| # | Topic | Current Status |
| --- | --- | --- |
| 1 | Exact email field name on all Excel templates | Email required when sending email offers; field availability depends on upload data |
| 2 | Exact PRI vendor / technical interface | Business requirement is PRI + SIM auto-pick + click-to-call; technical binding TBD in later design |
| 3 | Exact WhatsApp/Email template content | Predefined offers required; copy TBD by business |
| 4 | Whether Manager missed-follow-up alerts are same-day or next-day identical to TL | Follow-up: next-day TL alert stated; Call Later: TL + Manager alert stated |
| 5 | Bulk edit / export license-like controls | Observed in TeleCRM; not fully specified as must/don’t for new CRM |
| 6 | Marketing permission template usage | Exists in TeleCRM with 0 users; not requested as active role |
| 7 | Any multi-office / branch separation | Not requested |
| 8 | Auto-dialer and mobile app detailed scope | Future only |

---

## 20. Acceptance Criteria (Business)

The CRM will be considered business-accepted for day-one when:

| # | Acceptance Criterion |
| --- | --- |
| 1 | Admin can create hierarchy (Managers, TLs, Callers) and map relationships |
| 2 | Admin/Manager can create campaigns and upload Excel with phone duplicate + disposition-based past-case delete/ignore/reload |
| 3 | Campaign caller selection supports equal and percentage split; new callers auto-join campaign on upload |
| 4 | Callers only see/work assigned leads; can click-to-call via PRI; recordings available to supervisors |
| 5 | Configurable stages and call feedback work; Follow-up and Call Later are separate with scheduling + escalation |
| 6 | Interested alerts reach TL/Manager; Won marks at documents collected |
| 7 | WhatsApp and Email predefined offers send; “I am interested” replies create/alert leads in campaign views |
| 8 | Facebook, Website/API, WhatsApp, Google Ads leads enter automatically |
| 9 | Reports/leaderboard support day/week/month/hour and disposition productivity views by role |
| 10 | No dependency on TeleCRM historical data for go-live |

---

## 21. Requirements Traceability Summary

| BRD Area | Interview Topics Covered |
| --- | --- |
| §2–3 | Company workflow, products, scope, future |
| §4 | User roles |
| §5 | TeleCRM pain points & baseline screens |
| §6 | Customer journey |
| §7 | Lead sources |
| §8 | Lead assignment / campaigns |
| §9 | Excel, duplicates, documents field baseline |
| §10–11 | Follow-ups, dispositions, documents process |
| §12 | Banks (explicitly out), calling/PRI |
| §13–14 | Integrations, WhatsApp/Email |
| §15–16 | Reports, operational screens |
| §17–20 | NFR, assumptions, open items, acceptance |

---

## 22. Document Approval

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| Business Owner / Admin | | | |
| Manager Representative | | | |
| Business Analyst | | | |

---

## Appendix A — Disposition vs Call Feedback (Quick Reference)

| Concept | Purpose | Examples |
| --- | --- | --- |
| **Lead Stage / Disposition** | Where the lead sits in sales pipeline | Fresh, Ringing, Just Curious, Interested, Follow up, Won, Lost (+ reasons) |
| **Call Feedback** | Result of a specific call attempt | Number Busy, No Answer, Wrong Number, Switched Off, Connected, Call Later, Redialed |

---

## Appendix B — Role Permission Matrix (Summary)

| Function | Admin | Manager | Team Leader | Caller |
| --- | --- | --- | --- | --- |
| Manage all users & hierarchy | Yes | Partial (add/delete callers) | No | No |
| Upload Excel / manage data delete | Yes | Upload yes | No | No |
| Create/map campaigns & % split | Yes | Yes | No | No |
| Call leads | Yes* | Yes* | Yes* | Yes (assigned only) |
| Set dispositions | Yes* | Yes* | Yes* | Yes |
| Reassign leads/follow-ups | Yes | Yes | Yes | No |
| Listen to recordings | Yes | Yes | Yes | Not stated as need |
| View all reports | Yes | Team scope | Team scope | Own only |
| Configure stages/fields/rights | Yes | Not fully specified | No | No |
| WhatsApp/Email offer send | Yes* | Yes* | Yes* | Yes |
| See notes | Yes | Yes | Yes | Own notes |

\*Supervisory roles may call in practice; primary daily calling is Caller role.

---

## Appendix C — Day-One vs Future Checklist

| Item | Day One | Future |
| --- | --- | --- |
| Excel upload + duplicates | Yes | |
| Campaigns + % assignment | Yes | |
| PRI click-to-call + recording | Yes | |
| WhatsApp + Email offers & interest | Yes | |
| FB / Website / WA / Google Ads intake | Yes | |
| Reports & leaderboard | Yes | |
| Configurable stages | Yes | |
| Fresh go-live | Yes | |
| Bank stage tracking in CRM | No | Maybe later if requested |
| SMS | No | |
| Single lead form | No | |
| Star rating | No | |
| Auto-dialer | No | Yes |
| Mobile app | No | Yes |

---

*End of Business Requirements Document — Version 1.0*
