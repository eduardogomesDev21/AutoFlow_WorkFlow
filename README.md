# AutoFlow — Plataforma de Automação Visual de Workflows

AutoFlow é uma plataforma web intuitiva e moderna para criação, agendamento e execução visual de fluxos de trabalho (workflows) automatizados. Semelhante a ferramentas como n8n e Zapier, o AutoFlow permite conectar blocos lógicos e de ação em um canvas interativo, executar scripts personalizados em Python, gerenciar atrasos (delays), tomar decisões condicionais e acompanhar a execução dos processos em tempo real através de logs transmitidos por WebSockets.

---

## 🎯 Importância e Proposta do Projeto

Em ambientes corporativos ou de desenvolvimento, a automação de tarefas repetitivas é crucial para ganho de produtividade. O **AutoFlow** resolve essa dor ao entregar:
- **Autonomia Visual:** Permite mapear processos de forma simples, arrastando e soltando blocos.
- **Flexibilidade com Python:** Com o nó de Script Python, desenvolvedores podem escrever código sob medida para integrar APIs, processar dados ou manipular arquivos de forma isolada.
- **Monitoramento em Tempo Real:** Logs e status de execução são transmitidos instantaneamente para a tela via WebSockets, agilizando testes e depurações.
- **Agendamento Robusto:** Suporte a execuções agendadas com expressões Cron (via APScheduler) executadas em segundo plano.

---
## 🧠 Arquitetura do Sistema

O AutoFlow foi estruturado utilizando uma arquitetura desacoplada entre frontend, backend, engine de execução e comunicação em tempo real via WebSockets.

O diagrama abaixo representa o fluxo principal de execução dos workflows:

<img width="884" height="524" alt="fluxo" src="https://github.com/user-attachments/assets/ba1496c5-f2ca-4d6e-a09d-f9994bb2ee3b" />

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React (v19)**: Construção da interface com componentes reativos e hooks modernos.
- **Vite**: Ferramenta de build extremamente rápida para o ecossistema frontend.
- **ReactFlow (v11)**: Biblioteca poderosa para renderização do canvas interativo e manipulação de nós/arestas do fluxo.
- **Tailwind CSS & PostCSS**: Estilização moderna e responsiva utilizando um tema escuro (dark mode premium).
- **Framer Motion**: Micro-animações fluidas e transições de interface.
- **Lucide React**: Biblioteca de ícones moderna e consistente.

### Backend
- **FastAPI**: Framework moderno, rápido (alta performance) e fácil de usar para construir APIs com Python.
- **Uvicorn**: Servidor ASGI rápido e confiável.
- **SQLAlchemy & SQLite**: ORM para persistência dos dados de workflows, nós, conexões e históricos de execução.
- **APScheduler (Advanced Python Scheduler)**: Agendador de tarefas em segundo plano baseado em Cron.
- **WebSockets**: Comunicação bidirecional contínua para transmissão de logs de execução em tempo real.
- **Python Subprocess**: Ambiente temporário para execução isolada de scripts Python inseridos no canvas.

---

## 🖥️ Como Compilar e Rodar o Projeto Localmente

### Pré-requisitos
- **Python 3.10+** instalado.
- **Node.js 18+** e **npm** instalados.

---

### Passo 1: Executando o Backend (FastAPI)

1. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```

2. Crie e ative o ambiente virtual do Python (`venv`):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instale as dependências listadas no `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   python run.py
   ```
   *O backend estará rodando em [http://localhost:8000](http://localhost:8000).*

---

### Passo 2: Executando o Frontend (React + Vite)

Abra um novo terminal na raiz do projeto:

1. Navegue até a pasta do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências do Node:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento do Vite:
   ```bash
   npm run dev
   ```
   *O frontend estará rodando em [http://localhost:5173](http://localhost:5173).*

4. (Opcional) Para compilar a versão final e otimizada do frontend para produção:
   ```bash
   npm run build
   ```
   *Os arquivos compilados serão gerados na pasta `frontend/dist`.*

---

## ⚙️ Blocos de Ação Disponíveis no Canvas

1. **Início (Start):** O gatilho de execução manual do fluxo.
2. **Aguardar (Delay):** Pausa a execução sequencial por um número definido de segundos ou minutos.
3. **Condição (If):** Avalia expressões lógicas (igual, maior ou menor que) dinamicamente e ramifica o fluxo em caminhos `Verdadeiro` ou `Falso`.
4. **Registrar Log (Log):** Imprime mensagens no painel de controle do terminal em tempo real.
5. **Salvar Arquivo (Save File):** Cria arquivos `.txt` ou `.json` com o conteúdo processado no diretório `backend/generated/`.
6. **Script Python:** Permite rodar código Python arbitrário recebendo as variáveis anteriores através de um dicionário chamado `context`.
7. **Fim (End):** Ponto de término e consolidação da execução.

---

## 📸 Demonstração do Sistema (Mídias)
<img width="1347" height="636" alt="login_flow" src="https://github.com/user-attachments/assets/908f72d5-a0ad-4e46-911c-599ad80ccc52" />

---

<img width="1355" height="640" alt="Dashboard_flow" src="https://github.com/user-attachments/assets/8c6542b0-52f8-4dfd-896f-c24b3fff344e" >

---

<img width="1364" height="640" alt="Work_Flow" src="https://github.com/user-attachments/assets/f99f5679-5663-4323-851b-7b6b995f812d" />

---

<img width="1354" height="635" alt="bloco_python" src="https://github.com/user-attachments/assets/c01bfa87-0135-437f-8f8d-8666a82d4887" />

---

<img width="1357" height="643" alt="terminal_flow" src="https://github.com/user-attachments/assets/d2a63206-4ae9-48f8-95eb-38368d1ea5a3" />

---
