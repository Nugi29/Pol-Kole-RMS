# 🌴 Pol-Kole RMS — Backend Service

[![Java](https://img.shields.io/badge/Java-21%20LTS-orange.svg?style=flat-square&logo=openjdk)](https://adoptium.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-brightgreen.svg?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-6.x-green.svg?style=flat-square&logo=springsecurity)](https://spring.io/projects/spring-security)
[![Spring AI](https://img.shields.io/badge/Spring%20AI-1.0.0--M6-blue.svg?style=flat-square&logo=spring)](https://spring.io/projects/spring-ai)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue.svg?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![WebSocket](https://img.shields.io/badge/STOMP-WebSocket-red.svg?style=flat-square&logo=socketdotio)](https://spring.io/guides/gs/messaging-stomp-websocket/)
[![JasperReports](https://img.shields.io/badge/JasperReports-6.21.3-yellow.svg?style=flat-square)](https://community.jaspersoft.com/)

An enterprise-grade RESTful API and real-time backend engine powering the **Pol-Kole Resort & Restaurant Management System (RMS)**. Built with Java 21 and Spring Boot 3, it seamlessly coordinates hotel room lodging, multi-zone dining tables, live Kitchen Display Systems (KDS), omnichannel POS billing, staff dispatching, automated PDF reporting, and autonomous Generative AI analytics.

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technologies Used](#technologies-used)
- [Dependencies](#dependencies)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Running the Project](#running-the-project)
- [REST API Endpoints Reference](#rest-api-endpoints-reference)
- [Real-Time WebSocket & STOMP Broker](#real-time-websocket--stomp-broker)
- [Spring AI Autonomous Analytics Engine](#spring-ai-autonomous-analytics-engine)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [Author](#author)

---

## Features

### 1. Authentication, Authorization & Security (RBAC)
- **Stateless JWT Security**: Issues and validates HMAC-SHA256 tokens using `io.jsonwebtoken` (jjwt 0.12.6).
- **Fine-Grained Role-Based Access Control (RBAC)**: Supports roles (`ADMIN`, `MANAGER`, `RECEPTIONIST`, `WAITER`, `CHEF`, `CASHIER`, `STAFF`, `DISPLAY`).
- **Developer Authorization Barrier**: Critical system configurations (e.g. tax rates, restaurant metadata) require a developer security key.
- **Audit Logging**: Automatic JPA auditing (`@CreatedDate`, `@LastModifiedDate`, `@CreatedBy`, `@LastModifiedBy`) capturing operational events.

### 2. Omnichannel Order Management
- **Multi-Channel Ordering**: Processes orders across `DINE_IN`, `ROOM_SERVICE`, and `TAKEAWAY` channels.
- **Order Lifecycle Transitions**: Seamless lifecycle tracking (`PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `SERVED` $\rightarrow$ `BILLED` $\rightarrow$ `CANCELLED`).
- **Interactive Modifiers & Notes**: Supports item-level preparation remarks (e.g., spice levels, allergen alerts) and time tracking.

### 3. Real-Time Kitchen Display System (KDS)
- **Sub-Second Kitchen Sync**: Pushes instant order updates to kitchen stations via STOMP WebSocket topics (`/topic/kitchen`, `/topic/orders`).
- **Multi-Station Workflows**: Chefs claim, prioritize, prepare, and mark orders ready in real time.
- **Preparation Time Tracking**: Records order submission, start, and completion timestamps for kitchen throughput analytics.

### 4. Waiter Service Hub & Smart Dispatching
- **Guest Assistance Dispatch**: Table and room tablet calls (cutlery, water, bill request) are automatically routed to assigned duty waiters (`/topic/waiter`).
- **Duty Manager Fallback**: Unattended calls escalate automatically to the on-duty manager.
- **Cleaning & Table Turnaround Tasks**: Real-time broadcast of dirty table alerts and cleaning confirmations.

### 5. Hotel Lodging & Front Desk Operations
- **Room Inventory & Categorization**: Manages rooms, suite types, amenities, and floor assignments.
- **Reservations & Stays**: Handles advance bookings, walk-ins, guest details, check-in, key assignment, and room folios.
- **Integrated Billing**: Seamless transfer of room service dining tabs directly to the guest's hotel room folio.

### 6. Billing, Invoicing & Financial Settlement
- **Unified POS Settlement**: Supports mixed-mode payments (`CASH`, `CARD`, `LANKAQR`).
- **Dynamic Promotions & Discounts**: Time-windowed item-level discounts and promo vouchers.
- **Customer Loyalty Points**: Automated loyalty point accumulation and redemption calculations.
- **Automated Tax Engine**: Configurable dual-tax engine (VAT + Service Charge) per restaurant legal requirements.
- **JasperReports PDF Engine**: Generates professional print-ready customer receipts and business invoices.

### 7. Human Resources & Shift Management
- **Daily Staff Assignments**: Allocates waiters and service personnel to specific dining tables, zones, and hotel floors.
- **Staff Attendance & Shift Logs**: Tracks punch-in/out times, absence reasons, and duty status.

### 8. Enterprise AI Business Intelligence (Spring AI)
- **Autonomous Tool-Calling Agent**: Integrates LLMs via OpenAI-compatible endpoints (Groq / OpenAI) using Spring AI 1.0.0-M6.
- **Function Calling Architecture**: Uses `@Tool` methods in `ReportTools` to dynamically query database statistics (sales figures, table utilization, room yield, menu top sellers).
- **Natural Language Analytics**: Allows managers to ask queries like *"What were the top 3 selling dishes this month?"* or *"Analyze room occupancy trends"*.
- **Executive PDF Report Export**: Compiles AI-synthesized managerial reports into download-ready PDF documents using JasperReports.

---

## System Architecture

The backend implements a multi-tier, decoupled Object-Oriented architecture adhering to Domain-Driven Design (DDD) principles:

```
                  +-------------------------------------------------------------+
                  |                  Client Presentation Tier                   |
                  |     Angular 21 SPA / Customer Tablets / Takeaway Displays    |
                  +------------------------------+------------------------------+
                                                 |
                       [HTTP / REST (JSON)]      |      [WebSocket / STOMP]
                                                 v
                  +-------------------------------------------------------------+
                  |                      Spring Security 6                      |
                  |    JwtAuthenticationFilter | CorsFilter | SecurityFilterChain|
                  +------------------------------+------------------------------+
                                                 |
                                                 v
                  +-------------------------------------------------------------+
                  |                 REST Controllers & WS Broker                |
                  |   OrderController, KitchenController, BillingController...   |
                  |     SimpMessageSendingOperations (/topic, /queue, /app)     |
                  +------------------------------+------------------------------+
                                                 |
                                                 v
                  +-------------------------------------------------------------+
                  |                    Business Service Tier                    |
                  |   OrderServiceImpl, BillingServiceImpl, AttendanceService... |
                  +--------+---------------------+---------------------+--------+
                           |                     |                     |
                           v                     v                     v
                +--------------------+  +------------------+  +------------------+
                |  Spring Data JPA   |  | JasperReports    |  | Spring AI        |
                |  Repositories      |  | 6.21 Engine      |  | Tool Calling     |
                |  & Hibernate ORM   |  | (JRXML -> PDF)   |  | (Groq / OpenAI)  |
                +----------+---------+  +------------------+  +------------------+
                           |
                           v
                +--------------------+
                |  MySQL 8.0 Engine  |
                |  (pol-kole-db)     |
                +--------------------+
```

### Key Design Patterns Implemented
1. **Controller-Service-Repository (Layered Pattern)**: Clean separation between presentation endpoints, business transaction logic, and data access.
2. **Data Transfer Object (DTO) Pattern**: Decouples domain entities (`OrderEntity`) from public API schemas (`OrderDto`), preventing over-fetching and protecting internal database schemas.
3. **Observer / Publish-Subscribe Pattern**: Implemented via Spring WebSocket Message Broker (`@EnableWebSocketMessageBroker`) for real-time order and notification events.
4. **Auditing Listener Pattern**: JPA `AuditingEntityListener` automatically populates audit metadata across entities.
5. **Agentic Tool Calling Pattern**: Spring AI `@Tool` annotations allow LLMs to invoke internal transactional services autonomously to retrieve live operational data.

---

## Technologies Used

| Category | Technology / Library | Version | Description |
| :--- | :--- | :--- | :--- |
| **Language** | Java Development Kit (JDK) | 21 LTS | Core programming language leveraging modern Java features |
| **Framework** | Spring Boot | 3.4.3 | Application bootstrap, DI container, and embedded Tomcat |
| **Security** | Spring Security | 6.x | Stateless security, authorization filters, and password hashing |
| **Authentication** | JJWT (`jjwt-api`, `jjwt-impl`, `jjwt-jackson`) | 0.12.6 | JSON Web Token parsing, validation, and generation |
| **Persistence** | Spring Data JPA / Hibernate | 3.4.3 | Object-Relational Mapping (ORM) and declarative repositories |
| **Database** | MySQL Connector/J | 9.6.0 | Production-ready MySQL JDBC driver |
| **Real-time Comms** | Spring WebSocket & STOMP | 3.4.3 | Bi-directional, real-time message broadcasting |
| **AI Integration** | Spring AI (`spring-ai-openai`) | 1.0.0-M6 | Agentic tool-calling framework integrating Groq/OpenAI APIs |
| **Reporting** | JasperReports & OpenPDF | 6.21.3 / 1.3.43 | Enterprise PDF compilation and invoice formatting |
| **Mapping** | ModelMapper | 3.2.2 | Intelligent Entity-to-DTO and DTO-to-Entity mapping |
| **Code Generation**| Project Lombok | 1.18.42 | Reduces boilerplate (getters, setters, builders, loggers) |
| **Validation** | Spring Boot Starter Validation | 3.4.3 | Jakarta Bean Validation (`@Valid`, `@NotNull`, `@Size`) |
| **API Docs** | Springdoc OpenAPI Starter WebMVC | 2.8.5 | Automated Swagger UI and OpenAPI 3 schema generation |
| **Configuration** | Spring Dotenv | 4.0.0 | Loads `.env` environment variables into Spring environment |
| **Email Service** | Spring Boot Starter Mail | 3.4.3 | SMTP dispatching for billing notices and reservations |

---

## Dependencies

The following table summarizes the core dependencies defined in [`pom.xml`](pom.xml):

```xml
<dependencies>
    <!-- Core Web & Realtime Messaging -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-websocket</artifactId>
        <version>3.4.3</version>
    </dependency>

    <!-- Persistence & Database -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <version>9.6.0</version>
    </dependency>

    <!-- Security & JWT -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.6</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.6</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Generative AI & Autonomous Reporting -->
    <dependency>
        <groupId>org.springframework.ai</groupId>
        <artifactId>spring-ai-openai</artifactId>
    </dependency>

    <!-- Enterprise PDF Reporting -->
    <dependency>
        <groupId>net.sf.jasperreports</groupId>
        <artifactId>jasperreports</artifactId>
        <version>6.21.3</version>
        <exclusions>
            <exclusion>
                <groupId>com.lowagie</groupId>
                <artifactId>itext</artifactId>
            </exclusion>
        </exclusions>
    </dependency>
    <dependency>
        <groupId>com.github.librepdf</groupId>
        <artifactId>openpdf</artifactId>
        <version>1.3.43</version>
    </dependency>

    <!-- Developer Productivity & Config -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <version>1.18.42</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.modelmapper</groupId>
        <artifactId>modelmapper</artifactId>
        <version>3.2.2</version>
    </dependency>
    <dependency>
        <groupId>me.paulschwarz</groupId>
        <artifactId>spring-dotenv</artifactId>
        <version>4.0.0</version>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.8.5</version>
    </dependency>
</dependencies>
```

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Java Development Kit (JDK) 21**: Oracle JDK 21 or Eclipse Temurin OpenJDK 21.
- **Apache Maven 3.9+**: (The bundled `mvnw` wrapper can also be used directly).
- **MySQL Server 8.0+**: Running locally on port `3306` (or accessible over network).
- **Groq API Key / OpenAI API Key**: Required for Spring AI autonomous reporting features.

---

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Nugi29/Pol-Kole-RMS.git
cd Pol-Kole-RMS/Pol-Kole-Backend
```

### 2. Initialize the Database
Log in to MySQL and create the database schema:
```sql
CREATE DATABASE `pol-kole-db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
> [!NOTE]
> Hibernate is configured with `ddl-auto: update`, so table structures and relationships will be automatically generated upon initial boot.

### 3. Configure Environment Variables
Copy or modify the `.env` file located in `Pol-Kole-Backend/.env`:
```bash
cp .env.example .env   # If example file is provided, or create .env
```

Review and adjust the database credentials, JWT secret, and API keys as outlined in the [Configuration](#configuration--environment-variables) section below.

### 4. Build the Application
```bash
# Windows
.\mvnw.cmd clean install -DskipTests

# Linux / macOS
chmod +x mvnw
./mvnw clean install -DskipTests
```

---

## Configuration & Environment Variables

The backend utilizes `me.paulschwarz:spring-dotenv` to inject environment variables from a `.env` file directly into Spring's environment properties.

### Complete `.env` Reference

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `SERVER_PORT` | No | `8080` | Port on which the Spring Boot application listens |
| `DB_URL` | **Yes** | `jdbc:mysql://localhost:3306/pol-kole-db` | JDBC MySQL connection URL |
| `DB_USERNAME` | **Yes** | `root` | Database username |
| `DB_PASSWORD` | **Yes** | `your_db_password` | Database password |
| `JWT_SECRET` | **Yes** | *256-bit secret string* | Secret key for signing and verifying JWT tokens |
| `JWT_EXPIRATION` | No | `86400` | JWT validity duration in seconds (Default: 24 Hours) |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:4200` | Comma-separated allowed CORS origins |
| `MAIL_HOST` | No | `smtp.gmail.com` | SMTP email host for notification dispatch |
| `MAIL_PORT` | No | `587` | SMTP port (587 for TLS, 465 for SSL) |
| `MAIL_USERNAME` | No | `your_email@domain.com` | SMTP username / sender email |
| `MAIL_PASSWORD` | No | `your_app_password` | SMTP password or App-specific password |
| `MAIL_AUTH` | No | `true` | Enable SMTP authentication |
| `MAIL_STARTTLS` | No | `true` | Enable STARTTLS encryption |
| `GROQ_API_KEY` | **Yes** (for AI) | `gsk_...` | Groq / OpenAI compatible API key |
| `GROQ_BASE_URL` | No | `https://api.groq.com/openai` | Base URL for the OpenAI-compatible LLM endpoint |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` | Model identifier (e.g. `llama-3.3-70b-versatile`) |

---

## Running the Project

### Development Mode (Maven Wrapper)
```bash
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
./mvnw spring-boot:run
```

### Production JAR Deployment
```bash
# Build the production executable
./mvnw clean package -DskipTests

# Run the packaged JAR
java -jar target/Pol-Kole-0.0.1-SNAPSHOT.jar
```

Once running:
- **REST API Base URL**: `http://localhost:8080/api`
- **Swagger UI Interactive Docs**: `http://localhost:8080/swagger-ui/index.html`
- **OpenAPI 3 JSON Schema**: `http://localhost:8080/v3/api-docs`
- **WebSocket STOMP Endpoint**: `ws://localhost:8080/ws-stomp` or `ws://localhost:8080/ws/orders`

---

## REST API Endpoints Reference

### 1. Authentication & Users (`/api/user`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/user/login` | Public | Authenticate user and obtain JWT token |
| `POST` | `/api/user/register` | Public / Admin | Register new staff member |
| `GET` | `/api/user/profile` | Authenticated | Retrieve authenticated user profile |
| `GET` | `/api/user/get-all` | Authenticated | Fetch list of all system users |
| `PUT` | `/api/user/update/{id}` | Authenticated | Update user record |
| `DELETE` | `/api/user/delete/{id}` | Admin | Remove user record |

### 2. Dining Tables & Locations (`/api/tables`, `/api/table-locations`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tables` | Authenticated | Get all dining tables with current occupancy status |
| `POST` | `/api/tables` | Manager / Admin | Create new dining table |
| `PUT` | `/api/tables/{id}` | Manager / Admin | Update table details and seating capacity |
| `GET` | `/api/table-locations` | Authenticated | Fetch dining zones (e.g. Garden, Rooftop, Indoor) |

### 3. Hotel Rooms & Types (`/api/rooms`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | Authenticated | Get all hotel rooms and their live status |
| `POST` | `/api/rooms` | Manager / Admin | Register new room |
| `GET` | `/api/rooms/types` | Authenticated | List room categories (Deluxe, Suite, Standard) |

### 4. Reservations & Front Desk (`/api/reservations`, `/api/check-in-out`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/reservations` | Authenticated | List all dining table and room reservations |
| `POST` | `/api/reservations` | Authenticated | Create a new reservation booking |
| `POST` | `/api/check-in-out/check-in` | Authenticated | Check in guest to assigned room or table |
| `POST` | `/api/check-in-out/check-out` | Authenticated | Check out guest and finalize folio |

### 5. Menu & Item Discounts (`/api/menu`, `/api/item-discounts`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu/items` | Authenticated / Public | Get complete menu catalog with active discounts |
| `GET` | `/api/menu/categories` | Authenticated | List food and beverage categories |
| `POST` | `/api/menu/items` | Chef / Manager | Create new menu item |
| `POST` | `/api/item-discounts` | Manager | Configure scheduled or percentage promo discounts |

### 6. Orders & Kitchen KDS (`/api/orders`, `/api/kitchen`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Authenticated | Place a new dine-in, takeaway, or room service order |
| `GET` | `/api/orders/active` | Authenticated | Get all active in-flight orders |
| `PUT` | `/api/orders/{id}/status` | Authenticated | Update order status |
| `GET` | `/api/kitchen/queue` | Chef / Manager | Fetch real-time active kitchen preparation queue |
| `PUT` | `/api/kitchen/item/{id}/status` | Chef | Update kitchen ticket status (`PREPARING`, `READY`) |

### 7. Billing & Invoicing (`/api/billing`, `/api/vouchers`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/billing/generate` | Cashier / Manager | Compile invoice with taxes and discounts applied |
| `POST` | `/api/billing/pay` | Cashier | Record payment (`CASH`, `CARD`, `LANKAQR`) |
| `GET` | `/api/billing/invoice/{id}/pdf` | Cashier | Stream compiled JasperReports PDF receipt |
| `POST` | `/api/vouchers/validate` | Cashier | Validate discount coupon code |

### 8. Staff Operations & Attendance (`/api/attendance`, `/api/staff-assignments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/attendance/mark` | Authenticated | Mark daily staff attendance and shift log |
| `GET` | `/api/attendance/today` | Manager / Admin | View today's staff presence ledger |
| `POST` | `/api/staff-assignments` | Manager | Assign waiters to specific tables/zones |

### 9. AI Analytics & Reports (`/api/ai/reports`, `/api/reports`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/reports/chat` | Manager / Admin | Interactive AI business intelligence query |
| `GET` | `/api/ai/reports/pdf` | Manager / Admin | Download JasperReports executive AI summary PDF |
| `GET` | `/api/reports/daily-flash`| Manager / Admin | Daily revenue and operational KPIs |

---

## Real-Time WebSocket & STOMP Broker

Pol-Kole features a built-in STOMP WebSocket Message Broker configured in `WebSocketConfig.java`:

- **Handshake Endpoints**:
  - `ws://localhost:8080/ws-stomp` (With SockJS fallback)
  - `ws://localhost:8080/ws/orders` or `ws://localhost:8080/ws/rms` (Pure WebSocket)
- **Application Destination Prefix**: `/app`
- **Broker Broadcast Prefixes**: `/topic`, `/queue`

### Subscribed Topics
| Destination | Subscriber | Payload / Purpose |
| :--- | :--- | :--- |
| `/topic/orders` | Cashiers & Waiters | New orders placed, status modifications, order settlement |
| `/topic/kitchen` | Chef Stations | New kitchen tickets, item preparation updates, station alerts |
| `/topic/waiter` | Service Staff Tablets | Guest call-waiter alerts, ready-to-serve food notifications |
| `/topic/takeaway` | Public Big Screens | Real-time order readiness display for waiting takeaway guests |

---

## Spring AI Autonomous Analytics Engine

The backend integrates an autonomous tool-calling AI agent powered by Spring AI (`spring-ai-openai`):

```
+-------------------+      Natural Language Query       +------------------------+
|  Manager Client   | --------------------------------> |  AiReportingService    |
+-------------------+                                   +-----------+------------+
                                                                    |
                                                                    | Calls LLM with Tool Specs
                                                                    v
                                                        +------------------------+
                                                        |  Groq / OpenAI Model   |
                                                        |  (e.g. GPT-OSS / Llama)|
                                                        +-----------+------------+
                                                                    |
                                                                    | Emits Tool Calls
                                                                    v
+-------------------+      Invokes Business Logic       +------------------------+
| ReportServiceImpl | <-------------------------------- |      ReportTools       |
+-------------------+                                   +------------------------+
```

### Available AI Agent Tools (`ReportTools.java`):
1. `getSalesReport(dateExpression)`: Aggregates gross sales, net revenue, taxes, discounts, and channel breakdowns.
2. `getItemSalesReport(category, dateExpression, sortDirection, limit)`: Returns top-selling or least-selling dishes.
3. `getOrderStatistics(dateExpression)`: Computes ticket sizes, channel split (Dine-in vs Takeaway vs Room), and busiest days.
4. `getAvailableTables()`: Retrieves real-time dining floor capacity and table vacancies.
5. `getTablePerformance(dateExpression, sortDirection, limit)`: Ranks dining tables by revenue and turnover.
6. `getRoomRevenue(dateExpression)`: Analyzes hotel room occupancy rates, revenue, and guest stays.
7. `getTakeawayStatistics(dateExpression)`: Metrics specific to fast takeaway fulfillment.

---

## Project Structure

```
Pol-Kole-Backend/
├── .env                              # Environment variable configuration
├── mvnw / mvnw.cmd                   # Maven wrapper executables
├── pom.xml                           # Project Object Model & Maven dependencies
└── src/
    ├── main/
    │   ├── java/com/rms/polkole/
    │   │   ├── PolKoleApplication.java # Spring Boot main entry point
    │   │   ├── config/               # Security, WebSocket, Audit & AI configs
    │   │   │   ├── AiConfig.java
    │   │   │   ├── AuditConfig.java
    │   │   │   ├── JwtAuthenticationFilter.java
    │   │   │   ├── SecurityConfig.java
    │   │   │   └── WebSocketConfig.java
    │   │   ├── controller/           # REST endpoint controllers (25 controllers)
    │   │   │   ├── Auth/User/Billing/Order/Kitchen/Room/Table...
    │   │   ├── dto/                  # Data Transfer Objects
    │   │   ├── entity/               # Hibernate JPA Entities (37 domain entities)
    │   │   ├── exception/            # Global exception handling & error models
    │   │   ├── reporting/ai/         # Spring AI Assistant, Controller & Tools
    │   │   │   ├── AiReportController.java
    │   │   │   ├── AiReportingService.java
    │   │   │   ├── AiReportingServiceImpl.java
    │   │   │   └── ReportTools.java
    │   │   ├── repository/           # Spring Data JPA interfaces
    │   │   ├── service/              # Transactional business logic contracts
    │   │   │   └── impl/             # Service implementations
    │   │   └── util/                 # Utility classes (Date resolvers, code generators)
    │   └── resources/
    │       ├── application.properties
    │       ├── application.yml       # Primary application configuration
    │       └── reports/              # JasperReports templates (.jrxml) and logos
    │           ├── enterprise_ai_report.jrxml
    │           ├── enterprise_report.jrxml
    │           └── polkolelogo.png
    └── test/                         # Unit & integration test suites
```

---

## Future Improvements

- [ ] **Distributed Cache**: Introduce Redis for caching active table sessions and token blacklisting.
- [ ] **Payment Gateway Webhooks**: Direct webhooks integration for automated LankaQR, Stripe, or PayHere online settlements.
- [ ] **SMS & WhatsApp Dispatch**: Automated booking confirmation and bill receipts sent to customer phones via Twilio.
- [ ] **Microservice Decoupling**: Isolate AI Analytics and KDS Real-Time Broker into dedicated lightweight microservices.
- [ ] **Multi-Tenancy Support**: Enable multi-branch and franchise resort management from a single unified deployment.

---

