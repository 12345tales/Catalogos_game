# GameShelf — Catálogo Interativo de Jogos

Aplicação web responsiva para organizar uma biblioteca pessoal de jogos. O GameShelf tem uma interface escura, discreta e inspirada em catálogos de jogos, com destaque para as capas e para a navegação.

## Funcionalidades

- Cadastro de jogos com nome, categoria, ano, situação e capa opcional.
- Pré-visualização de capa antes do cadastro.
- Edição, exclusão e alteração da situação entre “Já joguei” e “Quero jogar”.
- Busca por nome, filtro por categoria e situação e ordenação por nome e ano.
- Estatísticas da coleção e indicador de progresso.
- Sugestões de jogos que podem ser adicionadas à biblioteca com um clique.
- Salvamento local no navegador (`localStorage`).
- Exportação e importação de backup em JSON.
- Artes SVG locais para o fundo e os cartões de demonstração.
- Layout responsivo para computadores, tablets e celulares.

## Tecnologias

- HTML5
- CSS3
- TypeScript
- Vite

## Como executar no Windows

1. Extraia o ZIP.
2. Abra no VS Code a pasta **GameShelf-Redesenhado** (a pasta onde está `package.json`).
3. No VS Code, abra **Terminal → Novo Terminal**.
4. Execute:

   ```powershell
   npm install
   npm run dev
   ```

5. Abra no navegador o endereço mostrado no terminal, normalmente `http://localhost:5173/`.

## Comandos úteis

```bash
npm run dev       # inicia o servidor de desenvolvimento
npm run typecheck # verifica os tipos do TypeScript
npm run build     # valida o projeto e gera a versão de produção
npm run preview   # abre uma prévia da versão de produção
```

## Como adicionar uma capa

No campo **Capa do jogo**, informe um endereço de imagem que comece com `https://` ou `http://`, ou um caminho local como `/images/minha-capa.jpg`. Para arquivos locais, coloque a imagem dentro de `public/images/`.

Use apenas imagens que você tem autorização para publicar. As artes SVG do projeto são ilustrações de demonstração; não são capas oficiais dos jogos representados.

## Onde os dados são salvos?

Os jogos são armazenados no navegador atual por meio de `localStorage`. Eles não são enviados para um servidor. Utilize os botões **Exportar** e **Importar** para criar e restaurar backups JSON. Os dados não são compartilhados automaticamente entre navegadores ou dispositivos.
