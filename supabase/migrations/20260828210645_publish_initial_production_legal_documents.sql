do $migration$
declare
  publication_time timestamptz := statement_timestamp();
  terms_content text := $terms$# Termos de Uso do Fate Light

Versão 2026.08.1 — vigente a partir de 28 de agosto de 2026.

## 1. Sobre o Fate Light

O Fate Light é um software de gestão financeira e operacional, de código aberto, desenvolvido no âmbito do projeto Fate Eight Tech e mantido por Richard Oliveira. Estes Termos regem o uso da instância oficial hospedada em `https://fatelight-alpha.vercel.app`.

O código-fonte é disponibilizado separadamente sob a Licença MIT. A licença do código permite usar, copiar, modificar e distribuir o software nas condições nela previstas, mas não obriga os mantenedores a hospedar, operar, prestar suporte ou garantir uma instalação de terceiros.

Quem instalar ou oferecer uma cópia própria do Fate Light será responsável pela operação dessa instalação, por seus usuários, documentos legais, segurança, suporte e tratamento de dados. Estes Termos não se aplicam automaticamente a instalações independentes.

## 2. Estado e finalidade do serviço

A instância oficial é gratuita, experimental e fornecida sem acordo de nível de serviço. Ela ajuda a organizar clientes, serviços, cobranças, despesas, documentos, domínios, alertas e histórico operacional.

O Fate Light não é banco, instituição de pagamento, escritório contábil ou consultoria jurídica, fiscal ou financeira. Informações, alertas e cálculos devem ser conferidos pelo usuário antes de fundamentar decisões, cobranças, declarações ou obrigações legais.

## 3. Conta e segurança

O usuário deve fornecer informações corretas, manter acesso exclusivo ao e-mail associado à conta e proteger seus dispositivos e sessões. Atividades realizadas por uma sessão autenticada serão atribuídas à conta correspondente, salvo falha comprovada do serviço.

Ao perceber acesso indevido, vulnerabilidade ou perda de controle da conta, o usuário deve encerrar as sessões quando possível e comunicar o problema pelo e-mail `richardesleyso@gmail.com`.

## 4. Dados inseridos pelo usuário

O usuário declara que possui autorização ou outra base legal adequada para cadastrar e tratar dados de clientes, contatos, cobranças, notas fiscais, comprovantes e demais informações de terceiros. Também é responsável pela exatidão desses dados, pelos prazos legais de guarda e por atender solicitações dos respectivos titulares quando aplicável.

O usuário conserva a titularidade de seu conteúdo. Ele concede à instância oficial somente a autorização técnica necessária para armazenar, processar, exibir, proteger e disponibilizar esse conteúdo conforme as funcionalidades solicitadas.

## 5. Uso aceitável

É proibido usar o serviço para violar a lei ou direitos de terceiros; armazenar conteúdo malicioso ou obtido sem autorização; tentar acessar contas, dados ou infraestrutura alheios; contornar controles de segurança; prejudicar a disponibilidade do serviço; automatizar abuso; ou apresentar o Fate Light como responsável por atividade profissional exercida pelo usuário.

O acesso poderá ser limitado ou suspenso quando isso for razoavelmente necessário para conter abuso, risco de segurança, indisponibilidade, ordem legal ou violação destes Termos. Quando possível, o usuário será informado.

## 6. Serviços de terceiros

A instância oficial depende de fornecedores de infraestrutura, atualmente incluindo Vercel, Supabase e Cloudflare Turnstile. Indisponibilidades, limites e regras desses fornecedores podem afetar o serviço. Links ou integrações externas seguem também os termos de seus respectivos operadores.

## 7. Disponibilidade, cópias e alterações

Por se tratar de projeto aberto e experimental, funcionalidades podem mudar, apresentar falhas ou ser descontinuadas. O usuário deve manter cópias adequadas dos dados e documentos que não possa perder. Backups da infraestrutura reduzem riscos, mas não substituem a guarda própria.

O serviço poderá receber manutenção, limites técnicos ou interrupções. Não há garantia de disponibilidade contínua, recuperação de todo dado removido ou compatibilidade permanente com versões anteriores.

## 8. Exclusão e encerramento

Solicitações de exportação ou exclusão de conta podem ser registradas no perfil e, na versão atual, passam por análise manual. A função de excluir todos os dados do espaço de trabalho é destrutiva e pode remover registros operacionais e arquivos vinculados; o usuário deve revisar a confirmação apresentada antes de executá-la.

Alguns registros poderão ser conservados pelo período necessário para cumprir obrigação legal, exercer direitos, investigar fraude ou preservar a segurança. A Política de Privacidade detalha esse tratamento.

## 9. Propriedade intelectual e código aberto

A marca, identidade visual e conteúdos próprios do projeto não são transferidos pelo simples uso do serviço. O uso e a redistribuição do código-fonte obedecem à Licença MIT incluída no repositório. Contribuições públicas feitas no GitHub ficam sujeitas às licenças, políticas e registros aplicáveis ao repositório e à plataforma.

## 10. Garantias e responsabilidade

Na extensão permitida pela lei, o serviço é fornecido no estado em que se encontra, sem garantias de adequação a finalidade específica, ausência de erros ou disponibilidade ininterrupta. Os mantenedores não respondem por decisões tomadas exclusivamente com base no sistema, dados incorretos inseridos pelo usuário, perda decorrente da ausência de cópia própria, uso ilícito ou falhas de serviços externos fora de seu controle razoável.

Nada nestes Termos exclui responsabilidade que a legislação brasileira não permita limitar.

## 11. Atualizações destes Termos

Novas versões indicarão sua data de vigência. Alterações relevantes serão comunicadas no próprio serviço ou por meio de contato disponível quando isso for viável. O uso continuado após a vigência de uma atualização representa ciência da nova versão, sem afastar consentimento específico quando ele for legalmente exigido.

## 12. Lei aplicável e contato

Aplicam-se as leis da República Federativa do Brasil. Eventuais conflitos observarão o foro competente definido pela legislação, inclusive regras obrigatórias de proteção do consumidor quando aplicáveis.

Dúvidas, solicitações de privacidade e relatos de segurança: `richardesleyso@gmail.com`. Repositório oficial: `https://github.com/RDEsley/Fate-Light`.
$terms$;
  privacy_content text := $privacy$# Política de Privacidade do Fate Light

Versão 2026.08.1 — vigente a partir de 28 de agosto de 2026.

## 1. Escopo

Esta Política explica como dados pessoais são tratados na instância oficial do Fate Light, disponível em `https://fatelight-alpha.vercel.app`. O Fate Light é um projeto de código aberto desenvolvido no âmbito da Fate Eight Tech e mantido por Richard Oliveira.

Instalações independentes não enviam dados automaticamente à instância oficial. Quem hospeda, modifica ou oferece sua própria instalação deve publicar uma política adequada à sua operação e assume a responsabilidade por aquele tratamento.

## 2. Responsável e contato

As decisões operacionais sobre o tratamento realizado na instância oficial são tomadas pelo mantenedor Richard Oliveira, no âmbito do projeto Fate Eight Tech. O canal para dúvidas, exercício de direitos e relatos de privacidade é `richardesleyso@gmail.com`.

## 3. Dados tratados

Conforme o uso das funcionalidades, podemos tratar:

- dados de conta, como e-mail, nome ou nome da empresa, telefone opcional, idioma, fuso horário e preferências;
- dados do espaço de trabalho e da empresa, como nome empresarial, nome fantasia, documento fiscal, moeda e configurações;
- informações inseridas sobre clientes e contatos, incluindo nome, e-mail, telefone, endereço, observações e situação cadastral;
- registros financeiros e operacionais, como serviços, cobranças, parcelas, descontos, despesas, pagamentos, domínios, alertas e histórico;
- arquivos enviados, como notas fiscais e comprovantes, armazenados em área privada;
- dados técnicos e de segurança, como sessões, identificadores, eventos de autenticação, registros de auditoria, falhas e sinais de prevenção a abuso;
- preferências locais do navegador, inclusive tutorial concluído, acessibilidade e animações.

Não solicitamos deliberadamente dados pessoais que não sejam necessários às funções escolhidas. Evite inserir dados sensíveis ou documentos excessivos em campos livres.

## 4. Finalidades e bases legais

Os dados são usados para criar e autenticar contas; prestar as funcionalidades solicitadas; organizar e exibir registros; proteger usuários e infraestrutura; prevenir abuso; diagnosticar falhas; atender solicitações; cumprir obrigações legais; e exercer direitos em processos administrativos ou judiciais.

Dependendo do contexto, o tratamento poderá se apoiar na execução de contrato ou de procedimentos solicitados pelo titular, no cumprimento de obrigação legal, no exercício regular de direitos, em interesses legítimos relacionados à segurança e melhoria do serviço, ou em consentimento quando ele for especificamente solicitado. A base adequada é avaliada conforme a operação concreta.

## 5. Dados de clientes cadastrados pelo usuário

Quando um usuário cadastra dados de seus próprios clientes, fornecedores ou contatos, ele define por que e como utilizará essas informações e deve possuir base legal para isso. A instância oficial realiza o processamento técnico necessário para entregar as funcionalidades, proteger os dados e atender instruções compatíveis com o serviço.

Solicitações feitas por um terceiro sobre dados cadastrados por um usuário podem precisar ser encaminhadas ao usuário responsável, sem prejuízo das medidas cabíveis à instância oficial.

## 6. Compartilhamento e operadores

Não vendemos dados pessoais e não os utilizamos para publicidade comportamental. Dados podem ser processados por fornecedores essenciais à operação, atualmente:

- Supabase, para autenticação, banco de dados e armazenamento privado de arquivos;
- Vercel, para hospedagem e entrega da aplicação;
- Cloudflare Turnstile, para proteção contra automação abusiva e fraude;
- provedor de e-mail transacional, se essa função vier a ser habilitada.

Também poderemos compartilhar informações quando necessário para cumprir obrigação legal, ordem válida, proteger direitos e segurança ou realizar uma operação técnica solicitada pelo próprio usuário. Cada fornecedor trata dados segundo seus próprios compromissos e medidas de segurança.

## 7. Transferências internacionais

Alguns fornecedores podem armazenar ou processar dados fora do Brasil. Nesses casos, buscamos utilizar serviços com mecanismos contratuais e de segurança compatíveis com a legislação aplicável. Ao escolher uma instalação própria, o respectivo operador define seus fornecedores e locais de processamento.

## 8. Cookies e armazenamento local

O sistema utiliza recursos estritamente necessários para autenticação, manutenção de sessão, segurança e preferências de interface. O Cloudflare Turnstile pode usar sinais técnicos para distinguir pessoas de tráfego automatizado. O navegador também pode guardar preferências, como redução de movimento e conclusão do tutorial. Não usamos esses recursos para anúncios personalizados.

Bloquear recursos essenciais pode impedir o login ou partes do funcionamento.

## 9. Conservação, exportação e exclusão

Os dados são conservados enquanto a conta ou o espaço de trabalho estiver ativo e pelo tempo adicional necessário para segurança, solução de disputas, exercício de direitos e obrigações legais. Prazos podem variar conforme a natureza do registro.

O perfil permite registrar pedidos de exportação ou exclusão. Na versão atual, esses pedidos são analisados manualmente. Também existe uma ação separada para excluir dados operacionais do espaço de trabalho. A exclusão pode não alcançar imediatamente cópias de segurança, que permanecem protegidas e são eliminadas conforme o ciclo técnico aplicável, nem registros cuja conservação seja obrigatória.

Antes de excluir informações, mantenha sua própria cópia de documentos e registros necessários.

## 10. Segurança

Adotamos controles compatíveis com o estágio do projeto, incluindo autenticação, isolamento de dados por espaço de trabalho, armazenamento privado de documentos, links temporários, trilhas de auditoria, validações e proteção antiabuso. Nenhum sistema, contudo, elimina completamente o risco de acesso indevido, falha ou perda.

Suspeitas de incidente ou vulnerabilidade devem ser enviadas de forma privada para `richardesleyso@gmail.com`, sem publicar dados pessoais, credenciais ou detalhes exploráveis em uma issue pública.

## 11. Direitos do titular

Nos limites da Lei Geral de Proteção de Dados Pessoais (LGPD), o titular pode solicitar confirmação e acesso; correção; anonimização, bloqueio ou eliminação quando cabível; portabilidade conforme regulamentação; informação sobre compartilhamentos; revisão de decisões automatizadas quando aplicável; oposição; e revogação de consentimento.

Para proteger a conta e terceiros, poderemos pedir informações razoáveis para confirmar identidade e vínculo com os dados. Solicitações devem ser enviadas a `richardesleyso@gmail.com`. Também é possível peticionar perante a Autoridade Nacional de Proteção de Dados nos casos previstos em lei.

## 12. Crianças e adolescentes

O serviço é voltado à gestão de atividades profissionais e não é direcionado a crianças. Não cadastre dados de crianças ou adolescentes sem necessidade, autorização e fundamento legal adequados.

## 13. Decisões automatizadas

O Fate Light pode calcular valores, estados de cobrança e alertas a partir das regras configuradas pelo usuário. Ele não realiza, por conta própria, análise de crédito, publicidade comportamental ou decisão com efeito jurídico sobre pessoas. A decisão final e a conferência dos resultados permanecem com o usuário.

## 14. Alterações desta Política

Esta Política poderá ser atualizada para refletir mudanças técnicas, legais ou operacionais. A versão e a data de vigência serão exibidas nesta página. Mudanças relevantes serão comunicadas no serviço ou por contato disponível quando viável.

Repositório oficial: `https://github.com/RDEsley/Fate-Light`.
$privacy$;
begin
  update public.legal_documents
  set status = 'retired', retired_at = publication_time
  where document_type in ('terms_of_use', 'privacy_policy')
    and status = 'published';

  insert into public.legal_documents (
    id, document_type, version, content_markdown, content_hash,
    published_at, effective_at, status, is_required
  )
  values
    ('20000000-0000-4000-8000-000000000001', 'terms_of_use', '2026.08.1', terms_content,
     encode(extensions.digest(convert_to(terms_content, 'UTF8'), 'sha256'), 'hex'),
     publication_time, publication_time, 'published', true),
    ('20000000-0000-4000-8000-000000000002', 'privacy_policy', '2026.08.1', privacy_content,
     encode(extensions.digest(convert_to(privacy_content, 'UTF8'), 'sha256'), 'hex'),
     publication_time, publication_time, 'published', true);
end;
$migration$;
