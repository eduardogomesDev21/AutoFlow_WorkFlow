# ⚙️ AutoFlow — Plataforma de Automação Visual de Workflows

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

## 📂 Estrutura de Pastas Recomendada

Para manter seu projeto organizado e pronto para exibição no GitHub, utilize a seguinte estrutura:

```text
AutoFlow/
├── backend/            # Código-fonte do servidor FastAPI
├── frontend/           # Código-fonte do cliente React + Vite
├── docs/               # Documentação complementar do projeto
│   └── media/          # 👈 COLOQUE SUAS FOTOS/VIDEOS DO SISTEMA AQUI
└── README.md           # Este arquivo de documentação
```

> [!TIP]
> Crie a pasta `docs/media/` na raiz do projeto e salve lá os prints do dashboard, do editor de fluxos e GIFs demonstrativos. Você pode referenciá-los no Markdown usando caminhos relativos, como: `![Dashboard](./docs/media/dashboard.png)`.

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

Substitua os links abaixo pelos prints ou GIFs reais que você salvar na pasta `docs/media/` para dar um destaque visual premium ao seu repositório:

| Tela do Editor | Painel de Logs em Tempo Real |
| :---: | :---: |
| ![Editor Canvas](./docs/media/editor.png) | ![Live Logs](./docs/media/logs.png) |

*(Exemplo de link de imagem: `![Descrição](./docs/media/nome_da_imagem.png)`)*
