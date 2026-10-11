# Validação automatizada — 9 de outubro de 2026

Resultado: testes funcionais e build aprovados; a verificação geral ainda tem pendências de lint, dependências de desenvolvimento e integração real/worker de produção.

| Verificação | Resultado desta execução |
| --- | --- |
| `npm test` | 62 aprovados, zero falhas |
| `npm run typecheck` | Aprovado |
| `npm run test:e2e` | 40 aprovados: 32 gerais e oito de paginação, desktop/celular |
| Cenários exclusivos de mouse em celular | Dois omitidos por não se aplicarem |
| `npm run build` | Aprovado, artefato Vinext/Workers em `dist` |
| `npm run check:secrets` | 123 arquivos compilados, zero arquivos com a credencial configurada |
| `npm audit --omit=dev` | Zero vulnerabilidades conhecidas |
| `npm audit` | Oito alertas altos; zero críticos, moderados ou baixos |
| `npm run lint` | Quatro erros e dez avisos |
| `npm run validate:tmdb` | Bloqueado por conexão no sandbox; autorização para execução externa recusada |
| `npm run validate:production` | Bloqueado antes da inicialização da aplicação: workerd, `GetFinalPathNameByHandleW`, erro 5, Acesso negado |

## Testes no navegador

Chromium instalado em `.playwright-browsers`. A primeira tentativa no sandbox falhou com `ERR_NETWORK_ACCESS_DENIED` ao acessar `127.0.0.1`. A repetição autorizada fora do sandbox passou.

A primeira fase omite oito cenários de paginação que são executados na segunda fase, em servidor isolado com catálogo remoto simulado. Portanto, somente os dois cenários de mouse no celular permaneceram omitidos ao final. A suíte cobre o destino do menu Temporadas quando a seção está vazia, busca, filtros, detalhes, retorno, layout, prévias, direção, créditos extensos e paginação. Os testes usam fixtures; não comprovam os dados atuais do TMDB nem a reprodução real do YouTube. Celular é emulação em Chromium.

Para repetir usando o navegador instalado no projeto:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH="$PWD\.playwright-browsers"
npm run test:e2e
```

## Segurança

Passaram os testes de rejeição de IDs e lotes inválidos, validação de paginação, respostas de falha sem credenciais, URLs seguras de provedores, ausência de destinos inseguros, cache, limitação de consultas externas e recuperação do orçamento. No navegador passaram os cabeçalhos de segurança e a resposta 429 com `Retry-After` e `Cache-Control: no-store` após excesso de consultas. Testes de componentes verificaram a política do worker em respostas 200/400/404/429/500 e HSTS em produção; isso não substitui sua execução no worker compilado.

Os oito alertas da auditoria completa pertencem à cadeia `braces` / `micromatch` / `fast-glob`, usada por ESLint e ferramentas de build do Vinext. O advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) informa negação de serviço por padrões profundamente aninhados e nenhuma versão corrigida. As sugestões do npm são downgrades dos frameworks; não foram aplicadas. A busca textual nos arquivos JavaScript de `dist/server` não encontrou referências a `braces`, `micromatch` ou `fast-glob`; essa busca limitada não prova ausência de código vulnerável.

Evidências salvas em `security-audit.json`, `security-audit-production.json` e `lint-results.json`. A auditoria sem dependências de desenvolvimento, isoladamente, não certifica todo o bundle, pois ferramentas responsáveis pela aplicação são declaradas em `devDependencies`.

## Lint

A configuração foi ajustada para excluir saídas de build, testes, relatórios e navegador baixado. Arquivos `.cjs` usam CommonJS legitimamente, então a regra que proíbe `require` não se aplica a eles. Nenhuma regra de hooks do código da aplicação foi desativada.

Erros encontrados:

- `app/catalog.tsx:27`: atualização síncrona de estado dentro de efeito.
- `app/use-directors.ts:31`: atualização síncrona de estado dentro de efeito.
- `app/use-watch-availability.ts:35`: atualização síncrona de estado dentro de efeito.
- `app/page.tsx:4`: construção de JSX dentro de `try/catch`, que não captura erros de renderização dos componentes.

Os dez avisos tratam de imagens sem otimização Next, variáveis não utilizadas e exports anônimos. O lint permanece reprovado; não foi mascarado para apresentar resultado positivo.

## Pendências

Corrigir os erros de lint e repetir a análise. Repetir as integrações reais e a verificação do worker em ambiente autorizado, com `CINE_E2E` desativado. Validar também a URL hospedada antes de aprovar publicação. Nenhuma publicação nem atualização de dependências foi realizada nesta execução.
