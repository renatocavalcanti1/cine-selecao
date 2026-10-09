# Integração TMDB

Configure apenas uma credencial em `.env.local` (ignorado pelo Git): `TMDB_API_KEY` ou `TMDB_READ_ACCESS_TOKEN`. Reinicie o servidor após alterar o arquivo. O token tem precedência quando ambos existem. A credencial fica na camada do servidor em `lib/tmdb.ts`; nunca use o prefixo NEXT_PUBLIC para ela.

## Catálogo

São consultados até 8 registros de cada grupo: filmes recentes, séries recentes, filmes bem avaliados e séries bem avaliadas, totalizando até 32 obras. A busca e os filtros atuam nessa seleção carregada, não em toda a base TMDB. Consultas são armazenadas em cache por uma hora.

Lançamentos usam estreia original nos últimos 180 dias, com data atual calculada no fuso America/Sao_Paulo. Para filmes, usa-se primary_release_date; para séries, first_air_date. Novas temporadas de séries antigas e datas regionais de distribuição ainda não fazem parte desse critério.

Vale assistir usa nota mínima 7,5, com pelo menos 500 votos para filmes e 200 para séries, e estreia anterior ao período de lançamentos. Não confundir esse filtro automático com crítica profissional ou curadoria humana; o texto de recomendação explica os critérios.

## Trailers

Somente vídeos do YouTube, do tipo Trailer e marcados como oficiais pelo TMDB. Preferência: PT-BR com título indicando dublagem; PT-BR com título indicando legendas; outros PT-BR; português de outra variante; outros idiomas. A indicação de dublagem/legendas é baseada no nome do vídeo, não na análise do áudio. Quando não há confirmação, a interface informa isso.

Primeiro são consultados vídeos em pt-BR. Se não houver trailer brasileiro elegível, consulta-se a lista sem filtro de idioma para escolher uma alternativa. Ausência de vídeo ou falha de consulta não impede exibir o elenco e a sinopse. Vídeos removidos ou com incorporação bloqueada dependem do YouTube; há um link alternativo ao vídeo.

## Validação

19 testes automatizados aprovados e TypeScript aprovado. Uma chamada real usando a credencial local retornou 32 obras (16 filmes, 16 séries), e uma página de detalhes retornou capa, 12 nomes no elenco e trailer marcado como PT-BR dublado pelo título. A credencial não foi exibida.

A suíte Playwright existente usa CINE_E2E=1 para manter os três títulos de demonstração como fixtures, sem depender da API ou revelar credenciais. Sua aprovação anterior não comprova esta integração no navegador; execute novamente após a alteração e confira também as obras reais manualmente.

## Créditos

O rodapé contém o logo oficial TMDB, link, atribuição de dados/imagens e aviso exigido. Asset sem alterações obtido de https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg, referenciado em https://commons.wikimedia.org/wiki/File:Tmdb.new.logo.svg. Regras: https://developer.themoviedb.org/docs/faq.

Para publicação futura, configure a credencial no ambiente de hospedagem. `.env.local` não é enviado ao repositório ou ao site publicado.

Validação real ampliada: npm run validate:tmdb verificou catálogo de 32 obras, limites de nota/votos e quatro páginas de detalhes, com capa, elenco e trailer. O resultado não comprova a reprodução dos vídeos no navegador.


## Ampliação do catálogo e fotos do elenco

O catálogo inicial agora usa as páginas completas da API (até 80 obras, 20 por grupo), sem descartar registros. O botão Carregar mais obras consulta as páginas seguintes e remove duplicações. A busca por nome consulta filmes e séries na API, mantendo o critério de avaliação/votos para obras anteriores aos lançamentos. Resultados podem ser paginados; a busca não fica limitada à página inicial. Correspondências exatas aparecem primeiro.

Os detalhes incluem até 12 fotos de pessoas retornadas em profile_path pelo TMDB, servidas pelo CDN oficial. Foto ausente ou com erro mostra Sem foto. Mantemos créditos no catálogo e atribuição nas páginas de detalhes. As imagens não se tornam livres de direitos autorais; o TMDB não declara propriedade sobre todas as imagens. Uso do projeto não comercial segue as condições da API: https://developer.themoviedb.org/docs/faq.

25 testes automatizados e TypeScript passaram. A busca real localizou Taxi Driver (movie-103) e Breaking Bad (tv-1396). Os testes E2E de navegador precisam ser repetidos após estas mudanças.
