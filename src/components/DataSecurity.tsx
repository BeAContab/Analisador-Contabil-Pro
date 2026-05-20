export function DataSecurity() {
  return (
    <div className="space-y-xl animate-in fade-in duration-500">
      <section className="flex flex-col gap-sm border-b border-outline-variant pb-md">
        <span className="text-label-caps font-label-caps text-secondary uppercase">Segurança</span>
        <h2 className="font-display-lg text-primary">Segurança dos Dados</h2>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
          <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined">shield_lock</span>
          </div>
          <h3 className="font-title-sm text-primary">Isolamento Local</h3>
          <p className="text-body-sm text-secondary leading-relaxed">
            Todo o processamento de OCR e análise lógica é executado dentro da sandbox do seu navegador. Isso significa que os dados nunca cruzam a rede para um servidor externo.
          </p>
        </article>

        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
          <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined">memory</span>
          </div>
          <h3 className="font-title-sm text-primary">Memória Volátil</h3>
          <p className="text-body-sm text-secondary leading-relaxed">
            Os dados processados residem apenas na memória RAM enquanto a aplicação está aberta. Não gravamos informações em bancos de dados ou armazenamento persistente sem sua ação explícita (como baixar um PDF).
          </p>
        </article>

        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
          <div className="w-12 h-12 bg-tertiary-container rounded-full flex items-center justify-center text-on-tertiary-container">
            <span className="material-symbols-outlined">encrypted</span>
          </div>
          <h3 className="font-title-sm text-primary">Criptografia em Trânsito</h3>
          <p className="text-body-sm text-secondary leading-relaxed">
            Embora os dados não sejam enviados, o acesso à aplicação é feito via HTTPS (TLS 1.3), garantindo que o código da ferramenta que chega ao seu navegador não foi interceptado ou modificado.
          </p>
        </article>

        <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-md">
          <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <h3 className="font-title-sm text-primary">Conformidade Corporativa</h3>
          <p className="text-body-sm text-secondary leading-relaxed">
            Nossa arquitetura é compatível com as políticas de TI mais rigorosas, pois elimina o risco de vazamento de dados via servidores de terceiros.
          </p>
        </article>
      </div>
    </div>
  );
}
