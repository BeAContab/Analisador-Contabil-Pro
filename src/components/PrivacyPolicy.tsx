export function PrivacyPolicy() {
  return (
    <div className="space-y-xl animate-in fade-in duration-500">
      <section className="flex flex-col gap-sm border-b border-outline-variant pb-md">
        <span className="text-label-caps font-label-caps text-secondary uppercase">Institucional</span>
        <h2 className="font-display-lg text-primary">Política de Privacidade</h2>
      </section>

      <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm space-y-lg text-on-surface">
        <section className="space-y-md">
          <h3 className="font-headline-md text-primary">1. Compromisso com a Privacidade</h3>
          <p className="text-body-md leading-relaxed">
            O Analisador Contábil Pro foi desenvolvido com o princípio de "Privacidade por Design". Entendemos que os dados contábeis são sensíveis e estratégicos, por isso nossa arquitetura garante que suas informações nunca saiam do seu controle.
          </p>
        </section>

        <section className="space-y-md">
          <h3 className="font-headline-md text-primary">2. Coleta de Dados</h3>
          <p className="text-body-md leading-relaxed">
            **Não coletamos seus dados contábeis.** O processamento dos arquivos PDF é realizado inteiramente no seu navegador (client-side). Os arquivos não são enviados para nossos servidores, não são armazenados em nuvem e não são utilizados para treinamento de modelos de IA de terceiros.
          </p>
        </section>

        <section className="space-y-md">
          <h3 className="font-headline-md text-primary">3. Cookies e Rastreamento</h3>
          <p className="text-body-md leading-relaxed">
            Utilizamos apenas cookies essenciais para o funcionamento técnico da plataforma e armazenamento temporário de preferências de interface (como o modo de visualização). Não utilizamos cookies de rastreamento de marketing ou publicidade.
          </p>
        </section>

        <section className="space-y-md">
          <h3 className="font-headline-md text-primary">4. Seus Direitos (LGPD)</h3>
          <p className="text-body-md leading-relaxed">
            Como os dados são processados localmente, você detém o controle total sobre eles. Ao fechar a aba ou limpar o cache do navegador, todos os dados processados na sessão são permanentemente eliminados da memória local.
          </p>
        </section>
      </article>
    </div>
  );
}
