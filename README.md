# Saíra Studio (nome provisório)

Site de um estúdio brasileiro de software: sites e landing pages, software sob medida, agentes de IA para empresas e otimização do Perfil da Empresa no Google.

O topo é uma mata 3D interativa (Three.js): um helicóptero acompanha o cursor, as árvores balançam com o vento do rotor e um clique planta um ipê. No modo escuro a mata anoitece e uma coruja-buraqueira aparece na lateral.

## Rodar na sua máquina

Precisa de [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`).

## Gerar a versão de produção

```bash
npm run build
```

O site pronto fica na pasta `dist/`. Para conferir o resultado antes de publicar: `npm run preview`.

## Onde fica cada coisa

| Arquivo | O que tem |
| --- | --- |
| `index.html` | Todo o texto e a estrutura da página |
| `src/style.css` | Cores, tipografia e layout (tema claro e escuro) |
| `src/forest.js` | A mata 3D: relevo, árvores, aves, helicóptero, dia e noite |
| `src/services.js` | As demonstrações animadas da seção de serviços |
| `src/theme.js` | Botão de tema e a coruja |
| `src/ui.js` | Filtro do portfólio e mensagem de contato |

## Ainda provisório

- O nome "Saíra" e a marca.
- Os projetos do portfólio (são exemplos).
- E-mail e demais contatos.
