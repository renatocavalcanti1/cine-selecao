# CINE Seleção

Catálogo de filmes e séries com trailers, elenco, direção e opções de onde assistir no Brasil. Projeto de portfólio desenvolvido com TypeScript e React, integrado ao TMDB pelo servidor.

A proposta é facilitar a descoberta de obras: reunir tendências, lançamentos, séries com novas temporadas e títulos bem avaliados em uma interface responsiva.

## Funcionalidades

- Seções Em alta, Temporadas, Lançamentos e Vale assistir.
- Busca de filmes e séries na API, filtros por tipo e gênero e paginação sem duplicações.
- Carrosséis nas seções de descoberta e lista vertical em Vale assistir.
- Prévia ao passar o mouse nos carrosséis; interação por toque adaptada ao celular.
- Detalhes com sinopse, pôster, elenco com fotos, direção e informações de episódios quando disponíveis.
- Trailers oficiais do YouTube, priorizando português brasileiro e indicando quando o idioma ou a dublagem não puderem ser confirmados.
- Disponibilidade no Brasil com ícones dos serviços, incluindo assinatura, aluguel e compra nos rótulos acessíveis.
- Nos detalhes, ícones de serviços cadastrados abrem o site oficial em nova guia.
- Cabeçalho persistente com busca e filtros; a marca restaura a página inicial.
- Tratamento de imagens ausentes, falhas da API e páginas não encontradas.

## Tecnologias

| Área | Ferramentas |
| --- | --- |
| Linguagem e interface | TypeScript, React e CSS |
| Estrutura da aplicação | App Router e APIs compatíveis com Next.js |
| Desenvolvimento e build | Vinext e Vite |
| Runtime de produção | Cloudflare Workers |
| Dados | TMDB; disponibilidade fornecida por JustWatch via TMDB |
| Vídeos | Player incorporado do YouTube |
| Testes de componentes e regras | Node.js Test Runner, Testing Library e jsdom |
| Testes no navegador | Playwright, com cenários desktop e celular |
| Integração contínua | GitHub Actions |

## Executar localmente

Requisitos: Node.js 22.13 ou superior e npm.

```bash
git clone https://github.com/renatocavalcanti1/cine-selecao.git
cd cine-selecao
npm ci
```

Crie `.env.local` na raiz com uma credencial obtida no TMDB:

```dotenv
TMDB_API_KEY=sua_chave_aqui
```

Também é possível usar `TMDB_READ_ACCESS_TOKEN` no lugar da chave. Se ambos estiverem presentes, o token tem precedência. Nunca use o prefixo `NEXT_PUBLIC_` para essas credenciais.

```bash
npm run dev
```

Acesse http://127.0.0.1:5173/ e mantenha o terminal aberto. Reinicie o servidor depois de alterar as variáveis de ambiente. No PowerShell, use `npm.cmd` e `npx.cmd` caso a execução dos comandos sem extensão seja bloqueada.

## Testes e validação

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run build
npm run check:secrets
```

Para validar dados reais e o runtime de produção, configure `.env.local` e execute:

```bash
npm run validate:tmdb
npm run validate:production
```

A suíte de navegador utiliza dados controlados para verificar comportamentos sem depender da API real. A validação TMDB cobre a integração externa separadamente.

Na revisão de 9 de outubro de 2026, passaram 60 testes de componentes, regras e segurança, 38 cenários de navegador, TypeScript e build. O runtime de produção também foi validado localmente, incluindo páginas, busca, disponibilidade, direção, requisições inválidas, resposta 404, cabeçalhos e ausência da credencial nas respostas. Esses resultados representam a revisão testada; não substituem novos testes após alterações ou validação da hospedagem.

A auditoria dessa revisão não identificou vulnerabilidades conhecidas nas dependências de produção. Foram registrados oito alertas altos nas ferramentas de desenvolvimento, que seguem como pendência de manutenção.

## Organização

```text
app/       páginas, componentes, interação e endpoints
lib/       integração TMDB, transformação de dados e regras
tests/     testes de componentes, regras e navegador
scripts/   execução, build e validações
public/    arquivos públicos
.github/   workflow de integração contínua
```

## Critérios e limites dos dados

Vale assistir usa nota mínima de 7,0, com limite de 6,0 para terror, além de uma quantidade mínima de votos. São critérios automáticos baseados nas avaliações do TMDB, não uma garantia de qualidade artística. A busca explícita por título não aplica esse corte.

A disponibilidade corresponde ao Brasil e pode mudar. Um link para o serviço abre seu site, não necessariamente a página específica da obra. Dados de temporadas, episódios e diretores dependem do preenchimento da fonte. Créditos de voz não são apresentados como dublagem brasileira sem confirmação.

Trailers podem ser removidos ou ter a incorporação bloqueada pelo YouTube. A indicação de dublagem ou legendas usa os metadados do vídeo; não resulta de análise do áudio.

## Segurança

As chamadas ao TMDB usam credenciais no servidor. `.env.local`, dependências instaladas, arquivos compilados e logs locais ficam fora do Git. Os endpoints validam entradas, limitam requisições e evitam expor credenciais em mensagens de erro. Links externos cadastrados usam destinos fixos e proteção `noopener noreferrer`.

Antes de publicar, cadastre a credencial como segredo na hospedagem, execute as validações e confira a URL publicada. Consulte [SECURITY-DEPLOY.md](SECURITY-DEPLOY.md) para o histórico técnico.

## Créditos e direitos de uso

Dados e imagens são fornecidos pelo TMDB. Disponibilidade: JustWatch via TMDB. Trailers são incorporados pelo player do YouTube. Marcas, fotos, pôsteres e vídeos pertencem aos respectivos titulares; este repositório não concede licença sobre esses materiais.

This product uses the TMDB API but is not endorsed or certified by TMDB.

Projeto de portfólio sem vínculo com os estúdios ou plataformas apresentados. Para outros usos, consulte as condições dos serviços e os direitos dos materiais envolvidos.

## Desenvolvimento assistido por IA

O projeto foi desenvolvido com apoio do Codex para implementação, revisão e testes. A condução incluiu definição de requisitos, avaliação da interface, identificação de problemas e acompanhamento das validações. O uso de IA é explicitado como parte do processo de desenvolvimento.

## Próximos passos

- Publicar a aplicação e validar seu funcionamento na hospedagem.
- Adicionar capturas de tela e o endereço da demonstração a este README.
- Acompanhar atualizações das dependências e resolver os alertas de desenvolvimento.

O projeto ainda não possui uma licença de código definida.
