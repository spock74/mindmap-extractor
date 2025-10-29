# `Extração e Visualizador de Grafo de Conhecimento com IA

Este é um aplicativo web interativo que extrai dados de textos científicos e os transforma em JSON estruturados ou texto bruto de documentos em grafos de conhecimento e mapas mentais dinâmicos e fáceis de explorar. Utilizando a API do Google Gemini, a aplicação pode extrair relações semânticas de arquivos `.pdf`, `.txt` ou `.md` e visualizá-las instantaneamente.

## Principais Funcionalidades

- **Geração de Grafo com IA:** Faça o upload de um documento (`.pdf`, `.txt`, `.md`), forneça um prompt e use a API do Gemini para extrair e visualizar um grafo de conhecimento automaticamente.
- **Visualização a partir de JSON:** Cole um JSON de "tripletas" (sujeito-predicado-objeto) para renderizá-lo instantaneamente como um grafo.
- **Layouts Automáticos:** Alterne entre múltiplas direções de layout (de cima para baixo, da esquerda para a direita, etc.) com um clique, graças à integração com a biblioteca Dagre.
- **Filtragem Interativa:** Filtre dinamicamente os nós do grafo por seu rótulo (conteúdo de texto) ou por seu tipo (ex: `drug`, `population`), permitindo focar em informações específicas.
- **Nós Personalizados e Estilizados:** Os nós são coloridos com base em seu tipo, tornando a visualização intuitiva e fácil de interpretar.
- **Controles de Navegação:** Inclui controles de zoom, pan e um minimapa para uma navegação fluida em grafos grandes.
- **Histórico de Gerações:** Os grafos gerados pela IA são salvos no seu navegador, permitindo que você os recarregue, visualize ou exclua em sessões futuras.
- **Validação Robusta:** As entradas JSON são validadas em tempo real usando Zod para garantir que os dados estejam no formato correto antes da renderização.
- **Internacionalização (i18n):** A interface da aplicação está disponível em Português (padrão) e Inglês. Use o seletor de idiomas na barra lateral para alternar entre os idiomas.

## Pilha de Tecnologia

- **Frontend:** React, TypeScript
- **Visualização de Grafo:** React Flow
- **Layout Automático:** Dagre.js
- **Estilização:** Tailwind CSS
- **Geração de Conhecimento:** Google Gemini API
- **Leitura de PDF:** PDF.js
- **Validação de Esquema:** Zod
- **Ambiente:** Aplicação sem build, utilizando `importmap` para carregar dependências diretamente no navegador a partir de um CDN.

## Como Usar

### Opção 1: Gerar um Grafo a partir de um Documento (com IA)

1.  Na barra lateral, selecione a aba **"Generate"**.
2.  Escolha o modelo do Gemini que deseja usar (ex: `gemini-2.5-flash`).
3.  Clique em **"Click to select a file"** para fazer o upload de um documento (`.pdf`, `.txt` ou `.md`).
4.  Opcional: Edite o prompt na área de texto para instruir a IA sobre como extrair as informações. O prompt padrão é otimizado para análise de artigos científicos.
5.  Clique no botão **"Generate with AI"**. A aplicação irá ler o arquivo, enviar o conteúdo e o prompt para a IA e, em seguida, renderizar o grafo com a resposta.

### Opção 2: Visualizar a partir de um JSON Manual

1.  Na barra lateral, selecione a aba **"Manual"**.
2.  Cole sua estrutura JSON na área de texto. O JSON deve conter um array chamado `triplets`.
3.  Clique no botão **"Generate Graph"**.

### Interagindo com o Grafo

- **Mudar o Idioma:** Use o seletor de idiomas no cabeçalho da barra lateral.
- **Mudar o Layout:** Use os botões na seção "Layout Direction" para reorganizar o grafo.
- **Filtrar Nós:** Use a seção "Filters" para buscar nós por texto no rótulo ou para mostrar/ocultar nós com base em seu tipo.

## Estrutura do Projeto

- `index.html`: O ponto de entrada da aplicação. Configura o `importmap` para carregar todas as dependências via CDN.
- `index.tsx`: O ponto de montagem do React.
- `App.tsx`: O componente principal que contém toda a lógica da aplicação, incluindo gerenciamento de estado, chamadas de API, manipulação de eventos e renderização da UI.
- `i18n.tsx`: Contém o provider de contexto e o hook customizado para o sistema de internacionalização.
- `locales.ts`: Armazena as traduções em formato de objeto para os idiomas suportados.
- `components/CustomNode.tsx`: Define o componente de nó personalizado para o React Flow, com estilização baseada no tipo do nó.
- `utils/layout.ts`: Contém a lógica para calcular as posições dos nós e arestas usando a biblioteca Dagre.
- `utils/schema.ts`: Define o esquema de validação Zod para garantir a integridade dos dados JSON.
- `constants.ts`: Armazena constantes utilizadas em toda a aplicação, como dados JSON padrão, cores e modelos de IA.
- `types.ts`: Define as interfaces TypeScript para as estruturas de dados do projeto.
