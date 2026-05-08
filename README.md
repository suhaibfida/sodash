# sodash
AI-powered Solana wallet dashboard that visualizes token portfolios, transaction flows, and rent recovery insights with an intelligent assistant.

<img width="14203" height="7147" alt="page" src="https://github.com/user-attachments/assets/34bab93f-6780-4eaf-ae77-1597fa48016d" />
<img width="1335" height="587" alt="image" src="https://github.com/user-attachments/assets/475df9ad-5eaa-4799-8253-e2df9b1088a8" />
<img width="1349" height="601" alt="image" src="https://github.com/user-attachments/assets/a8562b69-8a66-4fc5-943e-35ff2801612e" />
<img width="1335" height="594" alt="image" src="https://github.com/user-attachments/assets/dc06e737-9842-4ae2-842d-d56f932854fd" />
<img width="1344" height="595" alt="image" src="https://github.com/user-attachments/assets/30b615c9-e263-4e92-be30-ab823d9e6a57" />
<img width="538" height="499" alt="image" src="https://github.com/user-attachments/assets/c15dcfd5-3d68-4e1c-b1d0-16a5e568a257" />
<img width="1343" height="603" alt="image" src="https://github.com/user-attachments/assets/520d43c0-c767-4edf-838d-de258dfffa08" />









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



