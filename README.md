# sodash
AI-powered Solana wallet dashboard that visualizes token portfolios, transaction flows, and rent recovery insights with an intelligent assistant.
<img width="14203" height="7147" alt="exc" src="https://github.com/user-attachments/assets/0b915f83-c2c2-4805-853f-e0e0ff7266c7" />
<img width="1575" height="694" alt="image" src="https://github.com/user-attachments/assets/945b6b75-3265-4a54-b40b-fc73ffa8a2f0" />


#  Installation & Setup

## 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

---

## 2️⃣ Install dependencies

### Install all dependencies (root + apps)

```bash
bun install
```

Or if separate:

```bash
cd client
bun install

cd api
bun install
```

---

## 3️⃣ Environment Variables

Create `.env` files:

### 📁 client/.env

copy env. example & edit.

### 📁 api/.env

copy env. example & edit.

## 4️⃣ Run the project

### Start backend

```bash
cd api
bun run dev
```

### Start frontend

```bash
cd client
bun run dev
```

---

## 5️⃣ Open in browser

Frontend:

```
http://localhost:5173
```

Backend:

```
http://localhost:5000
```

---



## ⚠️ Important

* Never commit `.env` files

---

## 🛠️ Optional Scripts

If you want to run both together (from root):

```bash
bun run dev
```



