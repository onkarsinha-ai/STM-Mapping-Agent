# Database Connection Parameters Research

This document catalogs the connection parameters required for each database type commonly used in data engineering/ETL tools. Parameters are organized by database type, with required fields, optional fields, common defaults, and special authentication methods.

---

## PostgreSQL

### Required Fields
- **Host** — server hostname or IP address
- **Port** — TCP port (default: 5432)
- **Database** — database name
- **User** — username for authentication
- **Password** — password for authentication

### Optional Fields
- **SSL Mode** — SSL connection mode: `disable`, `allow`, `prefer`, `require`, `verify-ca`, `verify-full` (default: `prefer`)
- **SSL Root Certificate** — path to CA certificate file
- **SSL Client Certificate** — path to client certificate file
- **SSL Client Key** — path to client private key file
- **Connection Timeout** — seconds to wait for connection (default: 30)
- **Schema** — default schema to use (default: `public`)
- **Application Name** — identifies the client application in pg_stat_activity

### Special Authentication Methods
- **Kerberos / GSSAPI** — enterprise SSO authentication
- **LDAP** — directory-based authentication
- **Certificate-based** — client certificate authentication (no password)
- **SCRAM-SHA-256** — modern password hashing (default in PostgreSQL 14+)
- **AWS RDS IAM Authentication** — temporary token-based auth for RDS

---

## MySQL

### Required Fields
- **Host** — server hostname or IP address
- **Port** — TCP port (default: 3306)
- **Database** — database name
- **User** — username for authentication
- **Password** — password for authentication

### Optional Fields
- **SSL** — enable/disable SSL (default: false)
- **SSL CA** — path to CA certificate file
- **SSL Cert** — path to client certificate file
- **SSL Key** — path to client private key file
- **Connection Timeout** — seconds to wait for connection (default: 30)
- **Charset** — character set (default: `utf8mb4`)
- **Collation** — collation to use
- **Local Infile** — allow local file loading (default: false)

### Special Authentication Methods
- **caching_sha2_password** — default in MySQL 8.0, requires SSL or RSA key exchange
- **mysql_native_password** — legacy authentication plugin
- **LDAP / Active Directory** — enterprise directory authentication
- **PAM** — Pluggable Authentication Modules (Linux)
- **AWS RDS IAM Authentication** — temporary token-based auth
- **Azure AD** — Azure Active Directory authentication for Azure Database for MySQL

---

## Snowflake

### Required Fields
- **Account** — Snowflake account identifier (e.g., `xy12345.us-east-1`)
- **User** — username
- **Password** — password OR private key for key-pair authentication
- **Warehouse** — compute warehouse name
- **Database** — database name
- **Schema** — schema name

### Optional Fields
- **Role** — default role to assume
- **Region** — cloud region (can be embedded in account identifier)
- **Authenticator** — authentication method selector (default: `snowflake`)
- **Private Key File** — path to private key file (for key-pair auth)
- **Private Key Passphrase** — passphrase for encrypted private key
- **Client Session Keep Alive** — keep connection alive (default: false)
- **Login Timeout** — seconds to wait for login (default: 60)
- **Query Timeout** — seconds before query is cancelled (default: 0 = no timeout)
- **Tracing** — log level: `OFF`, `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`

### Special Authentication Methods
- **Key-Pair Authentication** — RSA private key instead of password (recommended for service accounts)
- **OAuth** — external OAuth 2.0 provider integration
- **SSO / SAML 2.0** — browser-based single sign-on
- **MFA / Duo** — multi-factor authentication via Duo
- **External Browser** — interactive browser-based authentication
- **OKTA Native** — native Okta authentication
- **Azure AD / Microsoft Entra ID** — Azure AD integration

---

## BigQuery

### Required Fields
- **Project ID** — Google Cloud project ID
- **Dataset** — default dataset (optional for some operations but usually required)

### Authentication (one of the following)
- **Service Account Key File** — path to JSON key file (legacy, not recommended)
- **Application Default Credentials (ADC)** — uses gcloud auth or environment (recommended)

### Optional Fields
- **Location** — dataset location / region (e.g., `US`, `EU`, `us-central1`)
- **Priority** — query priority: `INTERACTIVE` or `BATCH` (default: `INTERACTIVE`)
- **Maximum Bytes Billed** — query cost limit
- **Timeout** — query timeout in seconds
- **Use Query Cache** — enable result caching (default: true)
- **Labels** — job labels for cost tracking

### Special Authentication Methods
- **Application Default Credentials (ADC)** — preferred modern approach
  - `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to service account JSON
  - gcloud auth application-default login (user credentials)
  - Attached service account on GCE / Cloud Run / GKE
- **Service Account Impersonation** — act as another service account
- **OAuth 2.0 User Credentials** — interactive user consent flow
- **Workload Identity Federation** — authenticate external identities (AWS, Azure AD, OIDC)

---

## SQL Server

### Required Fields
- **Host / Server** — server hostname or IP address
- **Port** — TCP port (default: 1433)
- **Database** — database name
- **User** — username (for SQL Server authentication)
- **Password** — password (for SQL Server authentication)

### Optional Fields
- **Instance Name** — named instance (alternative to port)
- **Encrypt** — connection encryption (default: true in modern drivers)
- **Trust Server Certificate** — skip certificate validation (default: false)
- **Connection Timeout** — seconds to wait (default: 15)
- **Command Timeout** — seconds before command cancellation (default: 30)
- **Application Name** — identifies the client
- **MultiSubnetFailover** — enable for Always On availability groups

### Special Authentication Methods
- **Windows Authentication (Trusted Connection / SSPI / Kerberos)** — domain credentials, no username/password needed
- **Azure AD Password** — Azure AD username + password
- **Azure AD Integrated** — Azure AD via Windows integrated auth
- **Azure AD Interactive** — browser-based Azure AD login
- **Azure AD Service Principal** — app registration client ID + secret
- **Azure AD Managed Identity** — system/user-assigned managed identity (Azure-hosted only)
- **Active Directory Password** — Azure AD password authentication

---

## Oracle

### Required Fields
- **Host** — server hostname or IP address
- **Port** — TCP port (default: 1521)
- **Service Name** — database service name (e.g., `ORCLPDB1`)
  - OR **SID** — Oracle System Identifier (legacy)
  - OR **TNS Name** — pre-configured TNS alias
- **User** — username
- **Password** — password

### Optional Fields
- **Schema** — default schema
- **Connection Timeout** — seconds to wait (default: 15)
- **Fetch Size** — rows fetched per round trip (default: 100)
- **Enable Thick Mode** — use Oracle Instant Client (required for some features)
- **Wallet Location** — path to Oracle Wallet directory
- **TNS Admin** — path to tnsnames.ora directory

### Special Authentication Methods
- **Oracle Wallet** — secure credential store (no password in connection string)
- **Kerberos** — enterprise SSO
- **OS Authentication** — operating system credentials (e.g., `/` as username)
- **LDAP** — directory naming via Oracle Internet Directory
- **SSL / TLS** — encrypted connections with certificate verification
- **Azure AD / OAuth 2.0** — Azure AD integration for Oracle on Azure

---

## CSV (File-Based)

### Required Fields
- **File Path** — absolute or relative path to CSV file
  - OR **Directory Path** — path to directory containing CSV files
  - OR **URL** — HTTP(S) URL to remote CSV file

### Optional Fields
- **Delimiter** — field separator (default: `,`)
- **Quote Character** — character for quoting fields (default: `"`)
- **Escape Character** — character for escaping quotes (default: `"`)
- **Encoding** — file encoding (default: `utf-8`)
- **Header Row** — whether first row contains column names (default: true)
- **Skip Rows** — number of rows to skip before data
- **Null Values** — strings to interpret as NULL (e.g., `",", "N/A", "NULL"`)
- **Date Format** — format string for parsing dates
- **Decimal Separator** — decimal point character (default: `.`)
- **Thousands Separator** — thousands grouping character
- **Compression** — compression type: `gzip`, `bz2`, `zip`, `xz`
- **Line Terminator** — line ending: `\n`, `\r\n`, `\r`

### Special Authentication Methods
- **S3 / GCS / Azure Blob** — cloud storage credentials for remote files
  - AWS: Access Key + Secret Key, or IAM Role
  - GCS: Service Account Key or ADC
  - Azure: Storage Account Key, SAS Token, or Managed Identity
- **HTTP Basic Auth** — username + password for URL-based access
- **OAuth / Bearer Token** — for authenticated API endpoints returning CSV

---

## Parquet (File-Based)

### Required Fields
- **File Path** — absolute or relative path to Parquet file
  - OR **Directory Path** — path to directory containing Parquet files
  - OR **URL** — HTTP(S) URL or cloud storage URI

### Optional Fields
- **Partition Columns** — columns used for Hive-style partitioning
- **Row Group Size** — target row group size for writes
- **Compression** — compression codec: `snappy`, `gzip`, `brotli`, `zstd`, `lz4`, `none` (default: `snappy`)
- **Dictionary Encoding** — enable dictionary encoding (default: true)
- **Schema** — explicit schema override
- **Use Threads** — parallel reading (default: true)
- **Batch Size** — rows per read batch
- **Memory Pool** — memory allocation strategy

### Special Authentication Methods
- **S3** — AWS credentials (Access Key, Secret Key, Session Token, IAM Role)
- **GCS** — Google Cloud credentials (Service Account, ADC)
- **Azure Blob / ADLS Gen2** — Azure credentials (Account Key, SAS Token, Managed Identity)
- **HDFS** — Hadoop cluster credentials (Kerberos ticket)
- **HTTP Basic Auth / Bearer Token** — for authenticated endpoints

---

## Summary Table: Required Fields by Database Type

| Database   | Host | Port | Database | User | Password | Special Required Fields                |
|------------|------|------|----------|------|----------|----------------------------------------|
| PostgreSQL | Yes  | Yes  | Yes      | Yes  | Yes      | —                                      |
| MySQL      | Yes  | Yes  | Yes      | Yes  | Yes      | —                                      |
| Snowflake  | —    | —    | Yes      | Yes  | Yes*     | Account, Warehouse, Schema             |
| BigQuery   | —    | —    | —        | —    | —        | Project ID, Auth method (ADC or key)   |
| SQL Server | Yes  | Yes  | Yes      | Yes* | Yes*     | —                                      |
| Oracle     | Yes  | Yes  | —        | Yes  | Yes      | Service Name (or SID / TNS Name)       |
| CSV        | —    | —    | —        | —    | —        | File Path / Directory / URL            |
| Parquet    | —    | —    | —        | —    | —        | File Path / Directory / URL            |

*Snowflake password can be replaced by private key for key-pair auth.
*SQL Server user/password can be omitted when using Windows/Azure AD authentication.

---

## Notes for UI Design

1. **Conditional Fields**: Many optional fields should only appear when relevant (e.g., SSL certificate fields only when SSL is enabled).
2. **Authentication Tabs**: Snowflake, SQL Server, and BigQuery benefit from authentication method tabs (Password, OAuth, Key File, etc.).
3. **File Pickers**: CSV, Parquet, and certificate-based auth need file picker UI elements.
4. **Cloud Storage URIs**: For file-based sources, support URI schemes like `s3://`, `gs://`, `abfss://`, `hdfs://`.
5. **Test Connection Button**: Always provide a way to validate credentials before saving.
6. **Environment Variables**: Allow referencing env vars (e.g., `${DB_PASSWORD}`) for sensitive fields in production deployments.
