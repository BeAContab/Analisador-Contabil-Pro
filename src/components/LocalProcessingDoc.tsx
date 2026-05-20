export function LocalProcessingDoc() {
  return (
    <div className="space-y-xl animate-in fade-in duration-500">
      <section className="flex flex-col gap-sm border-b border-outline-variant pb-md">
        <span className="text-label-caps font-label-caps text-secondary uppercase">Documentação Técnica</span>
        <h2 className="font-display-lg text-primary">Processamento Local (Edge Computing)</h2>
      </section>

      <div className="flex flex-col lg:flex-row gap-lg">
        <article className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-xl p-xl shadow-sm space-y-lg">
          <div className="space-y-md">
            <h3 className="font-headline-md text-primary">Como funciona o motor de análise</h3>
            <p className="text-body-md text-on-surface leading-relaxed">
              O Analisador Contábil Pro utiliza tecnologias modernas de web (Web Workers e PDF.js) para converter o conteúdo dos arquivos PDF em estruturas de dados manipuláveis diretamente no seu computador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg pt-md">
            <div className="space-y-sm">
              <h4 className="font-title-sm text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">speed</span>
                Performance
              </h4>
              <p className="text-body-sm text-secondary">
                Ao eliminar o upload/download de arquivos pesados, a análise começa instantaneamente após o carregamento do arquivo.
              </p>
            </div>
            <div className="space-y-sm">
              <h4 className="font-title-sm text-primary flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">cloud_off</span>
                Zero Latência de Rede
              </h4>
              <p className="text-body-sm text-secondary">
                O processamento não depende da velocidade da sua internet, apenas do poder de processamento do seu hardware.
              </p>
            </div>
          </div>

          <div className="bg-surface-container-low p-lg rounded-xl border border-outline-variant mt-xl">
             <h4 className="font-label-caps text-secondary uppercase mb-md">Fluxo de Dados</h4>
             <div className="flex flex-col md:flex-row items-center justify-between gap-md text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold">1</div>
                  <span className="text-body-sm font-medium">Upload Local</span>
                </div>
                <div className="hidden md:block flex-grow h-[1px] bg-outline-variant border-t border-dashed"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold">2</div>
                  <span className="text-body-sm font-medium">Extração de Texto</span>
                </div>
                <div className="hidden md:block flex-grow h-[1px] bg-outline-variant border-t border-dashed"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold">3</div>
                  <span className="text-body-sm font-medium">Análise Lógica</span>
                </div>
                <div className="hidden md:block flex-grow h-[1px] bg-outline-variant border-t border-dashed"></div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold">4</div>
                  <span className="text-body-sm font-medium">Relatório Final</span>
                </div>
             </div>
          </div>
        </article>

        <aside className="lg:w-80 space-y-md">
          <div className="bg-primary-container text-on-primary-container p-lg rounded-xl border border-primary/20">
            <h4 className="font-title-sm mb-sm">Por que isso importa?</h4>
            <p className="text-body-sm opacity-90 leading-relaxed">
              Em ambientes corporativos, a segurança da informação é crítica. O processamento local elimina a necessidade de avaliações de segurança de dados complexas para provedores de nuvem externos.
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <h4 className="font-label-caps text-secondary mb-sm uppercase">Requisitos</h4>
            <ul className="text-body-sm space-y-2">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                Chrome, Edge ou Firefox
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                Mínimo 4GB RAM
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
