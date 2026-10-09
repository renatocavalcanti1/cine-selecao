# Segurança e descoberta — validação em 08/10/2026

## Revisão completa após os ajustes de interação

### Resultado final do worker atualizado

O usuário executou validate:production fora do sandbox após o build com a proteção de cabeçalhos. Status approved: TMDB 200, página inicial 200, detalhes 200, busca 200, disponibilidade 200, seis requisições inválidas rejeitadas, rota inexistente 404, cabeçalhos de segurança confirmados e credencial ausente nas respostas. A validação local do artefato atual está concluída. As referências a execução pendente abaixo descrevem etapas anteriores e estão superadas por este resultado.

Continuam pendentes as etapas de hospedagem: preparar repositório e prévia, cadastrar o segredo TMDB, configurar limites no edge e confirmar a URL final. A política do aplicativo bloqueou o envio por stdin no fluxo de preparação. Nenhuma publicação foi feita. Permanecem oito alertas altos nas ferramentas de build; a auditoria de dependências de produção tem zero alertas.

Na validação ampliada executada pelo usuário, TMDB e detalhes passaram, mas a página inicial não devolveu X-Content-Type-Options. Corrigido o worker para aplicar a política de segurança a toda Response devolvida pelo handler, inclusive caminhos de cache e erros. Mantém body em streaming, status, Cache-Control e demais cabeçalhos; remove X-Powered-By e aplica HSTS em produção. Dois testes novos cobrem os status 200/400/404/429/500 e a consistência com next.config.mjs. Total atualizado: 49 testes aprovados; TypeScript, novo build e varredura de credenciais aprovados. O worker atualizado ainda requer confirmação fora do sandbox com validate:production.

- 47 testes de componentes/regras aprovados.
- 17 testes E2E aprovados; um omitido por tratar exclusivamente do hover de desktop no projeto celular.
- TypeScript, build de produção e consulta real ao TMDB aprovados.
- Varredura de 116 arquivos gerados sem credenciais; 85 arquivos JavaScript do servidor sem referências a braces/micromatch/fast-glob.
- Auditoria atual de produção: zero alertas. Auditoria completa: oito altos na mesma cadeia de braces, sem correção oficial disponível. A sugestão automática de downgrade dos frameworks não foi aplicada. Isso não equivale a uma certificação de ausência de vulnerabilidades.
- validate:production ampliado para página inicial, detalhes, busca de A Bruxa de Blair, disponibilidade BR, seis parâmetros inválidos, 404, cabeçalhos incluindo HSTS e ausência de credenciais nas respostas HTML/JSON. Sua execução atual ainda precisa ser confirmada fora do sandbox.
- Site confirmado privado, pertencente ao usuário e sem versão publicada. A preparação do repositório foi bloqueada ao enviar o JSON pelo stdin: `approval required by policy, but AskForApproval::Granular.sandbox_approval is false`. O comando não recebeu a credencial e não houve push/publicação. Nenhum segredo da hospedagem foi configurado nesta revisão; limites no edge seguem pendentes.

### Próximo passo concreto

No PowerShell fora do sandbox, executar `npm.cmd run validate:production` na pasta deste projeto e conferir status approved. Depois resolver a restrição do fluxo de hospedagem, cadastrar o segredo TMDB e preparar uma prévia privada. A publicação final ainda não está validada.

## Mudanças

- Atualizados Next.js, React, React Server Components, Vinext, Vite, Cloudflare e dependências transitivas com correções disponíveis. Nenhum downgrade automático com `audit fix --force` foi aplicado.
- Cabeçalhos: nosniff, bloqueio de incorporação da página, política de referência, restrição de câmera/microfone/localização, CSP para imagens/iframes/objetos/base/formulários. HSTS em produção. A CSP é parcial: não impõe nonces aos scripts.
- API do catálogo: limite compartilhado de 60 requisições/minuto por instância, resposta 429 com Retry-After. Não confia em cabeçalhos de IP enviados pelo cliente.
- TMDB: cache em produção limitado a 300 entradas e uma hora, consultas simultâneas idênticas compartilhadas, falhas não armazenadas, resultados copiados antes do uso. Limite de 600 consultas externas/minuto por instância também protege páginas de detalhes.
- Testes E2E controlam e encerram seu próprio servidor; verificação de tipos regenera os arquivos para evitar conflitos entre Next e Vinext.

## Onde assistir

Disponibilidade no Brasil nos cartões e detalhes: assinatura, grátis, grátis com anúncios, aluguel e compra. Fonte JustWatch via TMDB e link de consulta. Datas de cinema somente para lançamentos brasileiros dos tipos 2 e 3. Não afirma exclusividade nem sessões atuais com base na ausência de streaming.

Consultas de cartões separadas em lotes de oito IDs validados, até 16 chamadas externas por requisição. Catálogo tem no máximo 28 chamadas (8 consultas base e até 20 confirmações de temporadas); busca tem quatro. A consulta deixa os títulos visíveis e informa falhas sem inventar disponibilidade. Entradas inválidas são rejeitadas antes de consultar o TMDB.

Validação real após essa divisão: 16 obras consultadas, cinco com opções de streaming e nenhuma falha técnica. A consulta anterior completa encontrou opções em 68 das 97 obras. Ausência de opções é resultado válido, não exclusividade nos cinemas.

## Novas seções

Em alta: tendências semanais de filmes/séries no TMDB; exclui pessoas e conteúdo adulto. Popularidade não representa avaliação de qualidade.

Novas temporadas: nota da série >= 7,5 e pelo menos 200 votos. Confirma detalhes da série, temporada 2 ou posterior, estreia da temporada e último episódio exibido nos últimos 90 dias. Exclui especiais e datas futuras. As datas são originais informadas pelo TMDB; não confirmam disponibilidade no Brasil.

As obras aparecem em uma seção principal, sem duplicar rotas. Uma temporada confirmada tem prioridade sobre tendências. Busca e paginação continuam disponíveis.

## Cartões compactos

Sinopse e disponibilidade aparecem em uma sobreposição na capa ao passar o mouse. No celular o botão Resumo abre e fecha a mesma área; foco nos links também revela o resumo, e Escape fecha. A sobreposição não aumenta os cartões nem cobre os links abaixo da capa. A sinopse tem até três linhas; opções de streaming usam texto compacto e rolagem quando necessário. As informações completas continuam nos detalhes.

Após a alteração visual: 43 testes de componentes/regras e 14 E2E aprovados, incluindo abrir/fechar por hover, toque, teclado e Escape. TypeScript e build aprovados. A aprovação do runtime registrada abaixo pertence à execução anterior do usuário; o artefato visual foi reconstruído e deve ser validado novamente antes da publicação.

## Evidências

Correção de busca/gêneros: busca explícita por título deixa de aplicar corte de nota/votos e aparece em Resultados da busca, sem rótulo de seleção bem avaliada. Descoberta por gênero consulta with_genres no TMDB por mídia; mantém critérios de qualidade e filtros durante paginação. Tipo/gênero acionam consulta remota; filtros locais continuam combinando com a busca. Consulta real encontrou A Bruxa de Blair (1999), outras três correspondências e 20 filmes de terror em Vale assistir na primeira página do gênero. Resultados adicionais são acessíveis em Carregar mais obras.

Nesta correção: 47 testes de componentes/regras, 16 E2E, TypeScript, build e varredura de credenciais aprovados. Inclui regressões de busca abaixo do corte, descoberta por gênero na API e preservação do gênero no carregamento de páginas no componente.

Atualização de layout e episódios: fileiras horizontais com setas, toque, teclado e preferência de movimento reduzido. As séries com novas temporadas exibem próximo episódio datado quando informado, ou último episódio exibido explicitamente identificado. Detalhes de séries usam o mesmo critério. Datas inválidas, especiais e datas futuras de episódios já exibidos não são apresentadas. As datas são originais do TMDB, sem promessa de horário ou disponibilidade regional. Consulta real encontrou metadados de episódios nas 11 séries com novas temporadas, sem acrescentar chamadas ao catálogo.

Validação desta atualização: 44 testes de componentes/regras, 16 E2E desktop/celular, TypeScript, build e verificação dos 116 arquivos sem credenciais aprovados. A execução de produção registrada no histórico é anterior a esta atualização; repetir validate:production antes de publicar o novo artefato.

- 43 testes de componentes, regras, API, cache e limites: aprovados.
- 14 E2E desktop/celular: aprovados, incluindo 404, cabeçalhos e 429.
- TypeScript: aprovado (`npm.cmd run typecheck`).
- Build de Sites/Vinext: aprovado (`npm.cmd run build`).
- Credencial ausente nos 116 arquivos gerados: aprovado (`npm.cmd run check:secrets`).
- API real: 97 obras na primeira página, 18 tendências e 11 séries com temporadas confirmadas; Taxi Driver e Breaking Bad encontrados; segunda página trouxe 92 obras adicionais. Os números mudam com os dados do TMDB.
- Auditoria completa: reduziu de 30 alertas (1 crítico) para 8 altos, todos na cadeia de `braces` usada por ferramentas. O advisory GHSA-vfj7-8cjw-p6xm informa ausência de versão corrigida. Não foram encontrados usos de braces/micromatch/fast-glob nos JS do servidor gerado, nem uso de padrões glob vindos da busca do usuário. Isso reduz a exposição observada, mas não elimina os alertas nem certifica todo o ambiente de build.
- `npm audit --omit=dev`: zero alertas. Essa filtragem, isoladamente, não certifica o bundle, pois há componentes do framework declarados em devDependencies.
- Um build alternativo de Next compilou e verificou tipos, mas falhou na geração de arquivo com EPERM no Windows. O artefato aprovado é o build de Sites/Vinext, não esse build alternativo.

## Execução de produção aprovada — resultado final

O usuário executou `npm.cmd run validate:production` no PowerShell fora do sandbox após a correção do roteamento de assets. Resultado: status approved, runtime production worker. TMDB respondeu 200 com a credencial disponível no servidor; detalhes responderam 200; rota inexistente respondeu 404; cabeçalhos de segurança foram confirmados; credencial não apareceu no HTML. A pendência de execução local de produção foi resolvida. As tentativas abaixo são histórico de diagnóstico, não pendências atuais.

A validação local não configura a hospedagem. Continuam necessários o segredo TMDB no servidor, CINE_E2E desativado, HTTPS, limites no edge e uma verificação na URL final. Os oito alertas nas ferramentas de build seguem documentados e precisam ser acompanhados.

### Histórico do diagnóstico

Diagnóstico confirmado na execução seguinte: `Fetch for user worker without having a user worker binding`. O ambiente Miniflare do teste estava configurado para executar primeiro o worker, mas sem declarar `assets.routerConfig.has_user_worker: true`. Corrigido no script; a conversão para Miniflare 5 foi testada e preserva tanto hasUserWorker quanto runWorkerFirst. Esse erro ocorria antes de executar a aplicação, portanto o 500 anterior não demonstra falha da página nem do TMDB. A execução completa após a correção ainda precisa ser confirmada fora do sandbox. Não foi necessário alterar ou reconstruir a aplicação para esta correção.

Executado pelo usuário fora do sandbox: o runtime iniciou, porém a página real respondeu 500 em vez de 200. Isso mantém o deploy bloqueado para aprovação. O teste agora verifica primeiro o acesso direto ao TMDB dentro do worker, informa a etapa da falha e coleta mensagens sanitizadas do runtime. O diagnóstico local é um wrapper de teste, não é incluído no worker publicado. Ainda não há evidência suficiente para atribuir ou corrigir a causa do 500.

Na tentativa seguinte, o runtime iniciou mas o probe não concluiu. Corrigido o diagnóstico para preservar exceção, stack e resposta sanitizada antes de interpretar JSON; import explícito de node:process no probe. Corrigida a montagem ISO das datas com formatToParts, validada com fallback de idioma en-US. Os 24 testes da camada TMDB, TypeScript, novo build e varredura de credenciais passaram. A causa do erro em produção segue sem confirmação até a próxima execução fora do sandbox.

O artefato compila, mas o Cloudflare workerd não iniciou neste sandbox do Windows: GetFinalPathNameByHandleW retornou acesso negado. Portanto os E2E aprovados validam o servidor Next em modo de desenvolvimento, não confirmam o runtime Cloudflare de produção.

Foi salvo um teste do artefato: npm.cmd run validate:production. Executar em PowerShell fora do sandbox após o build. Verifica detalhes reais, resposta 404, cabeçalhos e ausência da chave no HTML. Qualquer falha mantém a validação pendente. A configuração de HTTPS e limites no edge ainda precisa ser confirmada na hospedagem. Não considerar a revisão uma aprovação incondicional do deploy.

## Antes de publicar

Configurar TMDB_API_KEY ou TMDB_READ_ACCESS_TOKEN como segredo no servidor da hospedagem, sem NEXT_PUBLIC e sem enviar .env.local. Manter CINE_E2E desativado.

Publicar o artefato de produção via Sites; não expor o servidor de desenvolvimento. Validar HTTPS, cabeçalhos, chave não exposta, resposta 404 e dados reais na URL final.

Aplicar limite de requisições no edge/WAF da hospedagem para /api/catalog, /api/availability e /obra/*: os limites locais são por instância, reiniciam junto dela e não são uma proteção distribuída contra ataques volumétricos. Configurar o limite por cliente segundo o IP autenticado pela plataforma. As regras de hospedagem ainda não foram configuradas nesta revisão.

Acompanhar a correção oficial de braces e repetir a auditoria antes de cada publicação. Usar somente fontes de build confiáveis, pois o problema remanescente envolve processamento de padrões.

## Comandos

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run test:e2e
npm.cmd run validate:tmdb
npm.cmd run build
npm.cmd run check:secrets
npm.cmd audit
npm.cmd audit --omit=dev
```

Não houve publicação nesta etapa.

## Revisão após as alterações de layout — 08/10/2026

Vale assistir usa lista desde a primeira renderização, sem expansão; clicar ou tocar uma vez abre os detalhes. As outras seções continuam em carrossel com expansão. O aviso de cinema e sua data ficam à esquerda nos detalhes; a data informa a estreia, não confirma exibição atual. Streaming usa logotipos de 32 px, com nomes e modalidades acessíveis. Curadoria: nota mínima 7,0; terror 6,0; mínimo de votos preservado; novas temporadas continuam em 7,5.

- 49 testes de componentes, regras, integração simulada e segurança aprovados.
- 22 testes de navegador aprovados entre desktop e celular; testes exclusivamente de mouse são ignorados no celular.
- TypeScript e build de produção aprovados.
- Validação com API real TMDB aprovada, incluindo disponibilidade no Brasil, detalhes, clássicos e paginação.
- Varredura de 118 arquivos do build: nenhuma credencial encontrada.
- Auditoria de dependências de produção: zero vulnerabilidades conhecidas. Auditoria completa: oito alertas altos na cadeia de ferramentas de desenvolvimento, relacionados a braces. A versão mais recente consultada no registro npm permanece 3.0.3; as soluções sugeridas pelo audit rebaixam frameworks e não foram aplicadas.
- Validação do novo worker de produção tentada, mas bloqueada antes da inicialização por GetFinalPathNameByHandleW (Acesso negado) no ambiente do Codex. Reexecutar `npm.cmd run validate:production` no PowerShell local antes de publicar. A aprovação anterior não valida este novo artefato.

Ainda faltam a validação do worker atual e as verificações de hospedagem/URL publicada descritas acima. Esta revisão não é uma aprovação final de deploy.

## Retorno dos detalhes para o catálogo — 08/10/2026

A consulta pública de disponibilidade agora termina mesmo que seu componente seja ocultado pela navegação. Os resultados bem-sucedidos são reaproveitados em memória por cinco minutos, limitados a 300 obras, com agrupamento de consultas simultâneas e timeout de 15 segundos. Falhas temporárias não entram no cache; ao retornar, a consulta pode tentar novamente. Não se usa armazenamento persistente nem se armazenam credenciais no navegador.

Validações da revisão: 51 testes de componentes/regras aprovados; 24 testes de navegador aprovados em desktop/celular, incluindo retorno pelo link e pelo histórico, sem perder cinema/data/logotipos; TypeScript e build aprovados; API real TMDB aprovada (116 obras e disponibilidade de 16 amostras); 118 arquivos de produção sem credenciais; auditoria de produção sem alertas. Continuam oito alertas altos nas ferramentas de desenvolvimento. A nova tentativa de validar o worker continuou bloqueada por GetFinalPathNameByHandleW (Acesso negado), antes de executar a aplicação. Reexecutar validate:production fora do ambiente restrito antes de deploy.

## Cabeçalho persistente, restauração e alinhamento — 08/10/2026

O cabeçalho é compartilhado pelo layout, preservando busca e filtros nos detalhes. CINE SELEÇÃO limpa a busca, retorna tipo e gênero a Todos, restaura as obras e a paginação iniciais, fecha prévias e volta ao topo. A restauração remonta somente o conteúdo do catálogo, impedindo uma resposta de paginação antiga de repovoar a nova página. Os logotipos de streaming ficam centralizados somente nos detalhes; cinema/data não são mostrados nesse local.

Os dois comportamentos têm testes separados. Resultado atual: 51 testes de componentes/regras e 34 de navegador aprovados; TypeScript e build aprovados; API real TMDB e disponibilidade aprovadas; 122 arquivos de produção sem credenciais. Auditoria de produção: zero alertas conhecidos. Auditoria completa: oito alertas altos nas ferramentas de desenvolvimento. A validação do novo worker foi tentada e segue bloqueada antes de inicializar por GetFinalPathNameByHandleW (Acesso negado) no Codex. É necessário repetir `npm.cmd run validate:production` no PowerShell local e validar a hospedagem antes de considerar o deploy aprovado.

## Créditos extensos, direção e lista — 08/10/2026

O elenco resume três personagens por profissional, priorizando a participação por episódios. Campos com vários nomes separados por barra também são divididos. Os demais ficam em uma lista recolhida com altura máxima de 220 px. Dados reais de Os Simpsons confirmaram o resumo de Homer, Abe e Barney para Dan Castellaneta sem descartar os demais personagens.

A direção vem exclusivamente de créditos Director do TMDB, sem confundir criadores/roteiristas com diretores. É exibida nos detalhes, nas prévias e nas linhas de Vale assistir. Diretores de séries são ordenados por quantidade de episódios; os demais podem ser consultados nos detalhes. A lista consulta somente obras próximas da tela, em lotes de no máximo oito, com reaproveitamento por cinco minutos, limite de 300 entradas e timeout de 15 segundos. O endpoint valida identificadores, limita requisições e não expõe erros/credenciais do serviço externo. Cinema/data foram removidos da lista e dos detalhes, permanecendo nas prévias.

Validação: 59 testes de componentes/regras/segurança aprovados e 38 testes de navegador em desktop/celular, incluindo elenco de 303 personagens e direção nas prévias/lista. TypeScript e build aprovados; 123 arquivos sem credenciais. Validação real do elenco/direção de Os Simpsons e Clube da Luta aprovada. Auditoria: zero alertas conhecidos em dependências de produção e oito alertas altos nas ferramentas de desenvolvimento. A verificação do worker foi ampliada para testar direção e rejeitar lotes inválidos; sua execução no Codex continua dependente do desbloqueio do runtime local antes de deploy.

## Capas e links de streaming — revisão atual

Sessenta testes de componentes, regras e segurança aprovados; 38 testes de navegador aprovados (30 gerais e oito com catálogo remoto simulado). Dois casos exclusivos de mouse não se aplicam ao celular. TypeScript, build e integração real TMDB aprovados. Foram inspecionados 123 arquivos compilados, sem credenciais. Auditoria: zero vulnerabilidades conhecidas nas dependências de produção; oito alertas altos nas ferramentas de desenvolvimento.

Nos detalhes, logotipos com destino cadastrado usam URLs HTTPS fixas para serviços oficiais, target=_blank e rel=noopener noreferrer. Provedores desconhecidos não geram destinos a partir de nomes ou URLs externas. O teste específico confirma o destino, a nova guia, a proteção e a ausência desses links nos cartões compactos.

A validação do runtime de produção continua pendente: workerd falhou antes de iniciar a aplicação com GetFinalPathNameByHandleW, erro 5, Acesso negado. Executar npm.cmd run validate:production no PowerShell local e validar a URL hospedada antes de declarar o deploy aprovado.
