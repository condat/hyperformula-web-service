# HyperFormula Web Service

A high-performance, stateless REST API for executing Excel-like formulas. Powered by [HyperFormula](https://hyperformula.handsontable.com/), Fastify, and Node.js Worker Threads.

## 🚀 Features

- **Full Excel Logic:** Supports 600+ formulas, named expressions, and VLOOKUPs.
- **High Performance:** Offloads heavy calculations to a **Worker Thread Pool** (via Piscina) to keep the main event loop responsive.
- **Security First:** Protected by API Key authentication and built-in resource limits to prevent DoS via complex formulas.
- **Developer Friendly:** Auto-generated **Swagger/OpenAPI** documentation.
- **Production Ready:** Dockerized, includes health checks, graceful shutdown, and Zod-based request validation.

## 🛠 Tech Stack

- **Engine:** HyperFormula
- **Framework:** Fastify (Type-provider-zod)
- **Concurrency:** Piscina (Worker Threads)
- **Validation:** Zod
- **Documentation:** Swagger UI

---

## 🚦 Getting Started

### Prerequisites
- Node.js 24 LTS
- Docker & Docker Compose (optional)

### Local Development
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Setup environment:**
   Create a `.env` file:
   ```env
   PORT=3000
   API_KEY=your-secret-key
   WORKER_THREADS=4
   ```
3. **Start in dev mode:**
   ```bash
   npm run dev
   ```

### Running with Docker
```bash
docker-compose up -d
```
The service will be available at `http://localhost:3000`.

---

## 📖 API Documentation

Once the service is running, visit:
`http://localhost:3000/documentation`

### Example Request

**POST** `/calculate`
**Header:** `X-API-Key: your-secret-key`

```json
{
  "formula": "(#Data + #Risk * 5) / 2",
  "variables": {
    "Data": 7,
    "Risk": 3
  }
}
```

**Response:**
```json
{
  "status": "success",
  "result": 11
}
```

---

## 🧪 Testing

The project uses Jest for unit and integration tests.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

---

## ⚙️ Configuration

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server listens on | `3000` |
| `API_KEY` | Secret key required in `X-API-Key` header | *required* |
| `LOG_LEVEL` | Pino logging level (`info`, `debug`, `error`) | `info` |
| `WORKER_THREADS` | Number of worker threads for calculation | `4` / `available CPUs` |

---

## 🛡 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

**Note on Dependencies:**
This project uses **HyperFormula**, which is licensed under GPLv3.
Because of the copyleft nature of the GPLv3, this entire project is distributed
under the same terms.

If you wish to use this project under a more permissive license (like MIT)
in a commercial/proprietary environment, you must obtain a commercial license
for HyperFormula from [Handsontable](https://hyperformula.handsontable.com/#license).