gsap.registerPlugin(ScrollTrigger);

// Força o scroll para o topo assim que possível (o scrollRestoration já
// está desativado no <head>, mas isto garante a posição correta)
window.scrollTo(0, 0);

window.addEventListener("load", () => {
  window.scrollTo(0, 0);

  // Espera que a fonte customizada (IBM Plex Mono) esteja mesmo carregada
  // antes de medir qualquer texto — sem isto, as medições podem usar a
  // fonte de reserva do browser, com letras de tamanhos diferentes,
  // desalinhando todos os cálculos que dependem de posições exatas
  document.fonts.ready.then(() => {
  // Smooth scroll com momentum/inércia (Lenis): quando paras de fazer scroll,
  // o movimento continua um pouco, a desacelerar suavemente, em vez de parar logo
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Cria uns pássaros a voar pelo céu, com posição, velocidade e tamanho
  // aleatórios — dão vida à vista inicial antes de se fazer scroll
  const birdsContainer = document.createElement("div");
  birdsContainer.className = "birds";
  document.querySelector(".wrapper").appendChild(birdsContainer);

  const birdCount = 9;
  for (let i = 0; i < birdCount; i++) {
    const bird = document.createElement("div");
    bird.className = "bird";

    const topPos = 12 + Math.random() * 28; // fica na zona do céu
    const duration = 16 + Math.random() * 10;
    const delay = Math.random() * duration;
    const size = 20 + Math.random() * 16;
    const opacity = 0.35 + Math.random() * 0.35;

    bird.style.top = `${topPos}%`;
    bird.style.animationDuration = `${duration}s`;
    bird.style.animationDelay = `-${delay}s`;
    bird.style.opacity = opacity;

    bird.innerHTML = `
      <svg viewBox="0 0 30 14" width="${size}" height="${(size * 14) / 30}">
        <path class="wing wing-left" d="M15,7 Q7,0 0,4" stroke="rgba(20,20,20,0.75)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <path class="wing wing-right" d="M15,7 Q23,0 30,4" stroke="rgba(20,20,20,0.75)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    birdsContainer.appendChild(bird);
  }

  // Cria as partículas do efeito de vento com ângulos aleatórios (não uniformes),
  // em menor número. Cada partícula tem um "braço" que só roda (wind-particle)
  // e uma linha lá dentro que só se translada (span) — separar rotação e
  // translação evita que a linha rode sobre si mesma em vez de se mover.
  // Cria uma linha em SVG com uma onda suave ao longo do seu comprimento (como
  // uma cobra). O traçado é mais alto do que a área visível — desliza para cima
  // conforme se faz scroll, dando a sensação de que a própria onda "anda"
  const svgNS = "http://www.w3.org/2000/svg";
  const waveLength = 40;
  const amplitude = 5;
  const visibleHeight = 130;
  const pathHeight = visibleHeight + waveLength;

  function buildWavePath(totalHeight) {
    let d = "M10,0";
    let y = 0;
    let dir = 1;
    const half = waveLength / 2;
    while (y < totalHeight) {
      const endY = y + half;
      const controlX = 10 + dir * amplitude;
      d += ` Q${controlX},${y + half / 2} 10,${endY}`;
      y = endY;
      dir *= -1;
    }
    return d;
  }

  function createWindLine() {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", String(visibleHeight));
    svg.setAttribute("viewBox", `0 0 20 ${visibleHeight}`);

    const defs = document.createElementNS(svgNS, "defs");
    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.setAttribute("id", "windGradient");
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");
    gradient.setAttribute("x1", "10");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "10");
    gradient.setAttribute("y2", String(visibleHeight));

    [
      ["0%", "0"],
      ["55%", "0.9"],
      ["100%", "0"],
    ].forEach(([offset, stopOpacity]) => {
      const stop = document.createElementNS(svgNS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", "white");
      stop.setAttribute("stop-opacity", stopOpacity);
      gradient.appendChild(stop);
    });

    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Grupo interno com a onda, mais alto do que o viewBox — o excesso
    // fica escondido (o SVG recorta automaticamente fora do viewBox)
    const waveGroup = document.createElementNS(svgNS, "g");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", buildWavePath(pathHeight));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "url(#windGradient)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    waveGroup.appendChild(path);
    svg.appendChild(waveGroup);

    return { svg, waveGroup };
  }

  const windContainer = document.querySelector(".wind-effect");
  const windParticleCount = 16;
  const windParticles = [];

  for (let i = 0; i < windParticleCount; i++) {
    const arm = document.createElement("div");
    arm.className = "wind-particle";
    const { svg, waveGroup } = createWindLine();
    arm.appendChild(svg);
    windContainer.appendChild(arm);

    const angle = Math.random() * 360;
    gsap.set(arm, { rotation: angle });
    // Começa perto da borda do ecrã (em vh, adapta-se a qualquer tamanho de janela)
    gsap.set(svg, { y: "-65vh", scaleY: 1.5, opacity: 0 });

    // Duração e início aleatórios para cada partícula (entre 1.5 e 3 unidades),
    // garantindo sempre que termina dentro do trecho de scroll do unzoom (6 unidades)
    const duration = 1.5 + Math.random() * 1.5;
    const start = Math.random() * (6 - duration);
    windParticles.push({ line: svg, waveGroup, duration, start });
  }

  // Zoom inicial "fixo" da imagem das montanhas — já começa ampliada,
  // sem que esse zoom seja animado durante o scroll
  gsap.set(".section.hero-section", {
    scale: 10,
    transformOrigin: "center center",
  });

  const tl = gsap
    .timeline({
      scrollTrigger: {
        trigger: ".wrapper",
        start: "top top",
        // O ficheiro original tinha end: "+=2700%" para uma timeline de 17
        // unidades (~159% de scroll por unidade) — esse ritmo mantém-se.
        // A timeline agora vai até ~22.7 unidades (introdução + projetos +
        // carrossel da Experience) + ~0.2 de folga = ~22.9 x 159% = 3640%.
        // Se mudares durações lá em baixo, ajusta isto na mesma proporção.
        // Antes 3640%. Só os cards foram encurtados (CARDS_IN / CARDS_OUT,
        // menos 0.5 unidades no total): 22.2 unidades x ~160% ~ 3559%.
        // Se mudares CARDS_IN ou CARDS_OUT, ajusta isto na mesma proporção
        // (cada 1 unidade a menos = menos ~160% aqui).
        end: "+=3559%",
        pin: true,
        scrub: true,
        markers: false,
      },
    })
    .addLabel("reveal", 0)
    // 1. Assim que se começa a fazer scroll, o indicador "scroll down" e os
    // pássaros desaparecem
    .to(
      ".scroll-hint",
      {
        autoAlpha: 0,
        duration: 0.4,
      },
      "reveal"
    )
    .to(
      ".birds",
      {
        autoAlpha: 0,
        duration: 0.6,
      },
      "reveal"
    )
    // 1b. Ao mesmo tempo, o texto de boas-vindas aparece, suave, por cima das montanhas
    .to(
      ".welcome-text",
      {
        autoAlpha: 1,
      },
      "reveal"
    )
    // 2. O unzoom das montanhas começa logo aqui e corre sempre, de forma contínua,
    // independentemente do que acontece com o texto
    .to(
      ".section.hero-section",
      {
        scale: 1,
        duration: 6,
        transformOrigin: "center center",
      },
      "reveal"
    )
    // 2b. O efeito de vento aparece e acompanha toda a fase do unzoom
    .to(
      ".wind-effect",
      {
        autoAlpha: 1,
        duration: 1,
      },
      "reveal"
    )
    .to(
      ".wind-effect",
      {
        autoAlpha: 0,
        duration: 1,
      },
      "reveal+=5"
    )
    // 2c. Cada partícula de vento aparece na sua própria altura do scroll (não todas
    // ao mesmo tempo), converge um pouco em direção ao centro e desvanece bem mais
    // rápido do que o movimento — garantindo que já desapareceu antes de chegar perto do texto
    ;

  windParticles.forEach(({ line, waveGroup, duration, start }) => {
    tl.fromTo(
      line,
      { y: "-65vh", scaleY: 1.5, opacity: 0 },
      {
        y: "-20vh",
        scaleY: 0.4,
        duration,
        ease: "none",
      },
      `reveal+=${start}`
    )
      // A onda desliza ao longo do comprimento da linha à medida que se faz scroll
      .fromTo(
        waveGroup,
        { y: 0 },
        {
          y: -40,
          duration,
          ease: "none",
        },
        `reveal+=${start}`
      )
      .fromTo(
        line,
        { opacity: 0 },
        {
          opacity: 1,
          duration: duration * 0.25,
          ease: "none",
        },
        `reveal+=${start}`
      )
      .to(
        line,
        {
          opacity: 0,
          duration: duration * 0.5,
          ease: "none",
        },
        `reveal+=${start + duration * 0.5}`
      );
  });

  // 3. O texto fica visível um bom bocado (sem se desvanecer) e só depois começa a esvanecer,
  // sem interromper o unzoom, que continua a decorrer em paralelo
  tl.to(
    ".welcome-text",
    {
      autoAlpha: 0,
      duration: 2,
    },
    "reveal+=3"
  );

  // 4. Assim que o unzoom termina, o "Who I Am" aparece por cima da MESMA
  // imagem das montanhas — sem trocar de secção
  tl.addLabel("whoReveal", "reveal+=5");

  tl.to(".who-overlay", { autoAlpha: 1, duration: 0.6 }, "whoReveal");

  tl.to(
    ".who-sticky-title h2",
    { opacity: 1, y: 0, duration: 1 },
    "whoReveal"
  );

  tl.addLabel("whoTitleVisible", "whoReveal+=1");

  // Calcula quanto a faixa de blocos precisa de subir para mostrar todos,
  // com base na altura real de cada bloco (medida no próprio browser)
  const whoTrack = document.querySelector(".who-track");
  const whoViewport = document.querySelector(".who-viewport");
  const whoViewportHeight = whoViewport.clientHeight;
  const whoTrackDistance = Math.max(
    0,
    whoTrack.scrollHeight - whoViewportHeight
  );

  // Começa com a faixa empurrada para baixo (fora da janela) para que o
  // PRIMEIRO bloco também entre de baixo, tal como os restantes
  gsap.set(whoTrack, { y: whoViewportHeight });

  // Só depois do título estar visível e de mais um pouco de scroll é que o
  // conteúdo da direita aparece e começa a subir (o título fica sozinho no
  // ecrã até aqui)
  tl.to(
    ".who-viewport",
    {
      autoAlpha: 1,
      duration: 0.6,
    },
    "whoReveal+=0.3"
  );

  tl.to(
    whoTrack,
    {
      y: -whoTrackDistance,
      duration: 6,
      ease: "none",
    },
    "whoReveal+=0.3"
  );

  tl.addLabel("whoEnd", "whoReveal+=6.3");

  // 5. Depois disso, o conteúdo do Who I Am desaparece e o título "My Projects"
  // aparece centrado no ecrã, sobre a mesma imagem — igual ao Who I Am
  tl.to(
    [".who-word", ".who-viewport"],
    { autoAlpha: 0, duration: 1 },
    "whoEnd"
  );

  tl.to(
    ".who-sticky-title",
    { autoAlpha: 0, duration: 1 },
    "whoEnd"
  );

  // O ".who-overlay" (o contentor, não só o texto lá dentro) tem de
  // desvanecer também — sem isto ficava com opacity:1 pelo resto do
  // scroll, cobrindo o ecrã todo (sem se ver nada, por não ter fundo) e a
  // interceptar cliques/hover de tudo o que vem a seguir, incluindo os
  // cards de projetos
  tl.to(".who-overlay", { autoAlpha: 0, duration: 1 }, "whoEnd");

  tl.addLabel("projectsReveal", "whoEnd+=1.2");

  tl.to(
    ".projects-teaser h2",
    { opacity: 1, y: 0, duration: 1 },
    "projectsReveal"
  );

  // 6. Depois do título estar visível um bocado, a frase toda ("My Projects")
  // faz zoom (scale), ancorada exatamente na perna vertical do "j" via
  // transform-origin — assim ela cresce sempre a partir desse ponto exato,
  // sem cálculos de compensação que se desalinham com o zoom
  tl.addLabel("projectsZoomStart", "projectsReveal+=1");

  const projTitle = document.querySelector(".projects-teaser h2");
  const midLetter = document.querySelector(".mid-letter");

  const projTitleRect = projTitle.getBoundingClientRect();
  const midLetterRect = midLetter.getBoundingClientRect();

  // Ponto exato (em %) dentro do <h2> onde fica a perna vertical do "j" —
  // um pouco à direita do centro da letra, porque o gancho curvo em baixo
  // puxa a caixa da letra toda para a esquerda
  const jStemX = midLetterRect.left + midLetterRect.width * 0.62;
  const originXPercent =
    ((jStemX - projTitleRect.left) / projTitleRect.width) * 100;

  gsap.set(projTitle, {
    transformOrigin: `${originXPercent}% 50%`,
  });

  // Escala para a altura da letra "j" cobrir o ecrã, com uma margem —
  // fica uma faixa alta e fina, com as montanhas visíveis dos lados
  const targetScale = (window.innerHeight * 25) / midLetterRect.height;

  tl.to(
    projTitle,
    {
      scale: targetScale,
      duration: 2,
      ease: "power1.in",
    },
    "projectsZoomStart"
  );

  tl.addLabel("projectsEnd", "projectsZoomStart+=2.2");

  // Duração (em unidades da timeline, ~159% de scroll cada) da entrada e da
  // saída dos cards. Antes eram 0.4 + 0.05 de pausa + 0.4 (+0.35 até ao
  // início da Experience). Quanto mais pequenos, menos scroll com os cards
  // no ecrã — se mexeres aqui, acerta o "end" do ScrollTrigger lá em cima.
  const CARDS_IN = 0.15;
  const CARDS_OUT = 0.15;

  // 7. Em vez de o "j" desvanecer, o fundo passa a ficar com a mesma cor
  // dele (branco) — o "j" funde-se visualmente com o fundo em vez de
  // desaparecer, e é sobre essa cor que os cards de projetos aparecem
  tl.to(
    ".color-fill",
    { autoAlpha: 1, duration: CARDS_IN },
    "projectsEnd"
  );

  tl.to(
    ".project-list",
    { autoAlpha: 1, duration: CARDS_IN },
    "projectsEnd"
  );

  // Todos os cards aparecem ao mesmo tempo (sem stagger). Anima-se o
  // ".project-entry-inner" (o conteúdo), nunca o ".project-entry" (o botão)
  // em si — assim o GSAP nunca escreve um transform em linha no botão, e o
  // transform do :hover no CSS (translateY) funciona sempre sem conflito
  tl.fromTo(
    ".project-entry-inner",
    { y: 30, autoAlpha: 0 },
    {
      y: 0,
      autoAlpha: 1,
      duration: CARDS_IN,
      ease: "power1.out",
      clearProps: "transform",
    },
    "projectsEnd"
  );

  // Os cards ficam só o mínimo parados no ecrã (acabam de aparecer em +0.4)
  // antes de começarem a desvanecer — é também o ponto de descanso do snap
  tl.addLabel("projectsFadeOut", `projectsEnd+=${CARDS_IN}`);

  // Saída no mesmo estilo da entrada (fade + deslocamento), só que na
  // direção contrária: em vez de subir para o lugar a aparecer, os cards
  // desvanecem enquanto sobem e saem, de baixo para cima. Continua a
  // acontecer enquanto a secção está pinned, por isso nunca se vê os cards
  // a "subir" junto com o resto da página ao soltar o pin.
  tl.to(
    ".project-entry-inner",
    { y: -30, autoAlpha: 0, duration: CARDS_OUT, ease: "power1.in" },
    "projectsFadeOut"
  );

  // O botão em si (fundo + borda), não só o conteúdo lá dentro, também tem
  // de desvanecer — só a "autoAlpha" (opacidade), sem transform, para não
  // voltar a criar o conflito de inline-transform com o :hover no CSS
  tl.to(
    ".project-entry",
    { autoAlpha: 0, duration: CARDS_OUT, ease: "power1.in" },
    "projectsFadeOut"
  );

  // --- Secção "Experience": carrossel horizontal, dentro do MESMO pin ---
  // Já não é uma secção normal que sobe de baixo: é um overlay (".exp-overlay")
  // dentro do ".wrapper", por isso aparece com fade no próprio ecrã, logo
  // depois dos cards de projetos desaparecerem — sem nenhum scroll entre
  // secções. O trilho (".exp-track") é 4x mais largo que o ecrã (um "slot"
  // de 100vw por marco) e desliza para a esquerda: os marcos ainda não
  // alcançados ficam à direita, fora do ecrã, e vão "aparecendo". Cada
  // ponto, ao chegar ao centro, dá zoom e mostra o texto todo; com mais
  // scroll, encolhe e esconde o texto enquanto o trilho avança.
  const expOverlay = document.querySelector(".exp-overlay");
  const expTrack = document.querySelector(".exp-track");
  const expDots = document.querySelectorAll(".exp-dot");
  const expTexts = document.querySelectorAll(".exp-text");
  const expProgress = document.querySelectorAll(".exp-progress-dot");
  const expMotifs = document.querySelectorAll(".exp-bg-motif"); // desenhos de fundo (parallax)

  // Bullets de cada marco (para entrarem um a um, com atraso entre eles)
  const expBullets = [...expTexts].map((t) => t.querySelectorAll("li"));

  // Efeito de "letras a baralharem-se e assentarem" nos títulos. Não usa
  // plugins: um objeto {p: 0..1} é animado pela timeline (por isso segue o
  // scroll, para a frente e para trás) e, a cada frame, as letras até
  // p * comprimento mostram o texto real e as restantes letras aleatórias.
  // A fonte é mono, por isso a largura não muda enquanto baralha; os
  // espaços mantêm-se para as quebras de linha ficarem sempre iguais.
  const SCRAMBLE_CHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/<>_+=";
  function makeScramble(el) {
    const original = el.textContent;
    const state = { p: 0 };
    const render = () => {
      const settled = Math.floor(state.p * original.length);
      let out = "";
      for (let k = 0; k < original.length; k++) {
        const ch = original[k];
        out +=
          k < settled || ch === " "
            ? ch
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      el.textContent = out;
    };
    return { state, render };
  }
  const expTitles = [...expTexts].map((t) => makeScramble(t.querySelector("h3")));

  // Etiquetas de tecnologias de cada marco
  const expTags = [...expTexts].map((t) => t.querySelectorAll(".exp-tags span"));

  // Ícones que se desenham a si próprios: cada forma com traço recebe
  // pathLength=1, o que permite animar o strokeDashoffset de 1 -> 0 sem
  // medir comprimentos. As formas sem traço (os pontinhos preenchidos)
  // não se "desenham": aparecem com um fade no fim.
  const expIcons = [...expTexts].map((t) => {
    const shapes = [...t.querySelector(".timeline-icon").children];
    const strokes = shapes.filter((el) => el.getAttribute("stroke") !== "none");
    const dots = shapes.filter((el) => el.getAttribute("stroke") === "none");
    strokes.forEach((el) => el.setAttribute("pathLength", "1"));
    return { strokes, dots };
  });

  // Dois anéis por bola (o 2º um pouco atrasado) para parecer uma onda
  const expRings = [...expDots].map((dot) =>
    [0, 1].map(() => {
      const ring = document.createElement("span");
      ring.className = "exp-ring";
      dot.parentElement.appendChild(ring);
      return ring;
    })
  );

  // Pulso na linha: um segmento preto (100vw, centrado na bola) que cresce
  // do centro para os cantos e depois desvanece, como se o pulsar da bola
  // se propagasse pela linha
  const expLinePulses = [...expDots].map((dot) => {
    const pulse = document.createElement("span");
    pulse.className = "exp-line-pulse";
    dot.parentElement.appendChild(pulse);
    return pulse;
  });

  if (
    expOverlay &&
    expTrack &&
    expDots.length === 4 &&
    expTexts.length === 4 &&
    expProgress.length === 4
  ) {
    // Estados do indicador de baixo (pontinhos): ativo = "pílula" preta,
    // visitado = pontinho cinzento-escuro, por visitar = definido no CSS
    const P_ACTIVE = { width: 18, backgroundColor: "#111111" };
    const P_DONE = { width: 6, backgroundColor: "rgba(0,0,0,0.45)" };

    gsap.set(expOverlay, { autoAlpha: 0 });
    gsap.set(expDots, { scale: 1, transformOrigin: "center center" });
    gsap.set(expTexts, { autoAlpha: 0, y: 20 });
    // O 1º marco já entra com zoom, com o texto visível e com a bola cheia:
    // aparece tudo junto com o overlay, sem um passo de zoom separado
    gsap.set(expDots[0], { scale: 2.2, backgroundColor: "#111111" });
    gsap.set(expTexts[0], { autoAlpha: 1, y: 0 });
    // Bullets começam escondidos e ligeiramente abaixo; títulos baralhados
    gsap.set(expBullets.flatMap((b) => [...b]), { autoAlpha: 0, y: 12 });
    expTitles.forEach((t) => t.render());
    // Ícones por desenhar, etiquetas escondidas, anéis invisíveis
    expIcons.forEach(({ strokes, dots }) => {
      gsap.set(strokes, { strokeDasharray: "1 2", strokeDashoffset: 1 });
      gsap.set(dots, { opacity: 0 });
    });
    gsap.set(expTags.flatMap((t) => [...t]), { autoAlpha: 0, y: 8 });
    gsap.set(expRings.flat(), { opacity: 0 });
    gsap.set(expLinePulses, { scaleX: 0, opacity: 0, transformOrigin: "50% 50%" });
    if (expMotifs.length === 4) {
      gsap.set(expMotifs, { opacity: 0, x: 0 });
      gsap.set(expMotifs[0], { opacity: 0.16 });
    }
    gsap.set(expProgress[0], P_ACTIVE);

    const ZOOM = 0.4; // duração do zoom-in/out de cada ponto
    const DWELL = 0.6; // tempo de leitura de cada texto (scroll parado em cada bola)
    const MOVE = 0.6; // duração do deslize do trilho entre marcos

    // Detalhes visuais de cada marco, todos relativos ao instante "at" em que
    // o marco chega ao centro: anéis a sair da bola, ícone a desenhar-se e,
    // por fim, as etiquetas de tecnologias a entrar uma a uma
    function marcoExtras(i, at) {
      // Pulsar mais rápido: anéis a expandir em 0.4s (antes 0.7s)
      expRings[i].forEach((ring, k) => {
        const t0 = at + k * 0.08;
        tl.to(
          ring,
          {
            width: 78,
            height: 78,
            marginTop: -39,
            marginLeft: -39,
            duration: 0.4,
            ease: "power2.out",
          },
          t0
        );
        // Opacidade por keyframes: sobe depressa e desvanece a expandir,
        // mas volta sempre a 0 quando a timeline anda para trás
        tl.to(
          ring,
          {
            keyframes: [
              { opacity: 0.5, duration: 0.06, ease: "none" },
              { opacity: 0, duration: 0.34, ease: "none" },
            ],
          },
          t0
        );
      });

      // O pulso propaga-se pela linha: escurece da bola para os cantos e
      // depois volta ao normal
      tl.to(
        expLinePulses[i],
        { scaleX: 1, duration: 0.5, ease: "power2.out" },
        at
      );
      tl.to(
        expLinePulses[i],
        {
          keyframes: [
            { opacity: 1, duration: 0.08, ease: "none" },
            { opacity: 1, duration: 0.22, ease: "none" },
            { opacity: 0, duration: 0.3, ease: "power1.in" },
          ],
        },
        at
      );

      // Troca do desenho de fundo com um fade suave para o do novo marco
      if (expMotifs.length === 4) {
        tl.to(expMotifs[i - 1], { opacity: 0, duration: 0.5 }, at);
        tl.to(expMotifs[i], { opacity: 0.16, duration: 0.5 }, at + 0.1);
      }

      const { strokes, dots } = expIcons[i];
      tl.to(
        strokes,
        { strokeDashoffset: 0, duration: 0.5, stagger: 0.06, ease: "power1.inOut" },
        at + 0.05
      );
      if (dots.length) {
        tl.to(dots, { opacity: 1, duration: 0.2, stagger: 0.05 }, at + 0.45);
      }

      tl.to(
        expTags[i],
        { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.04, ease: "power1.out" },
        at + 0.45
      );
    }

    // Entra logo a seguir ao fade-out dos cards (que acaba em projectsFadeOut+0.4)
    tl.addLabel("experienceReveal", `projectsFadeOut+=${CARDS_OUT}`);

    // Título + linha aparecem no ecrã, com o mesmo estilo de entrada dos
    // cards (fade + pequena subida)
    tl.to(expOverlay, { autoAlpha: 1, duration: 0.4 }, "experienceReveal");
    tl.fromTo(
      [".exp-title", ".exp-viewport", ".exp-text-stack"],
      { y: 30 },
      { y: 0, duration: 0.4, ease: "power1.out" },
      "experienceReveal"
    );

    tl.addLabel("experienceVisible", "experienceReveal+=0.4");

    // O 1º marco já está visível com o overlay, mas o título "escreve-se" e
    // os bullets entram um a um logo a seguir
    tl.fromTo(
      expTitles[0].state,
      { p: 0 },
      { p: 1, duration: 0.5, ease: "none", onUpdate: expTitles[0].render },
      "experienceReveal+=0.1"
    );
    tl.to(
      expBullets[0],
      { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.12, ease: "power1.out" },
      "experienceReveal+=0.25"
    );
    // Momento em que o 1º marco já está todo escrito (usado pela navegação)
    marcoExtras(0, tl.labels["experienceReveal"] + 0.1);
    tl.addLabel("experienceReady", "experienceReveal+=0.95");

    // Posições absolutas na timeline, para poder somar durações
    let pos = tl.labels["experienceVisible"] + DWELL;

    for (let i = 1; i < 4; i++) {
      // Marco anterior encolhe (a bola fica cheia) e esconde o texto,
      // enquanto o trilho desliza para trazer o próximo marco ao centro
      tl.to(expDots[i - 1], { scale: 1, duration: MOVE }, pos);
      tl.to(expTexts[i - 1], { autoAlpha: 0, y: -20, duration: MOVE }, pos);
      tl.to(
        expTrack,
        { x: `${-100 * i}vw`, duration: MOVE, ease: "power1.inOut" },
        pos
      );
      // O desenho de fundo desloca-se só uns pixels (bem menos que os
      // 100vw do trilho), na mesma duração: anda visivelmente mais devagar
      if (expMotifs.length === 4) {
        tl.to(expMotifs, { x: "-=14", duration: MOVE, ease: "power1.inOut" }, pos);
      }
      pos += MOVE;

      // Novo marco, agora centrado, dá zoom, mostra o texto e a bola enche
      tl.to(
        expDots[i],
        { scale: 2.2, backgroundColor: "#111111", duration: ZOOM },
        pos
      );
      tl.to(expTexts[i], { autoAlpha: 1, y: 0, duration: ZOOM }, pos);
      // Título baralha-se e assenta, letra a letra, da esquerda para a direita
      tl.fromTo(
        expTitles[i].state,
        { p: 0 },
        { p: 1, duration: 0.5, ease: "none", onUpdate: expTitles[i].render },
        pos
      );
      // Bullets entram um a um, com um pequeno atraso entre eles
      tl.to(
        expBullets[i],
        { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.12, ease: "power1.out" },
        pos + 0.1
      );
      marcoExtras(i, pos);
      // Ponto de "descanso" deste marco: tudo já assentou (título escrito,
      // bullets, etiquetas e pulso terminados) e o trilho ainda não arrancou
      tl.addLabel("expPoint" + i, pos + 0.9);
      // Indicador de baixo: o anterior passa a "visitado", o novo fica ativo
      tl.to(expProgress[i - 1], { ...P_DONE, duration: ZOOM }, pos);
      tl.to(expProgress[i], { ...P_ACTIVE, duration: ZOOM }, pos);
      pos += ZOOM + DWELL;
    }

    // Saída de tudo (título, linha e último texto) a desvanecer no sítio,
    // para o pin soltar já com o ecrã limpo em vez de "subir" com a página
    tl.to(expOverlay, { autoAlpha: 0, y: -30, duration: 0.4, ease: "power1.in" }, pos);
    tl.addLabel("experienceEnd", pos + 0.4);
  }

  // Depois do ScrollTrigger recalcular tudo (o momento em que a posição
  // costuma "saltar" num refresh), força outra vez o scroll ao topo
  ScrollTrigger.addEventListener("refresh", () =>
    lenis.scrollTo(0, { immediate: true })
  );
  ScrollTrigger.refresh();

  // --- Scroll "de ponto em ponto" na Experience ---
  // Qualquer scroll (roda, trackpad, toque ou teclado), por mais pequeno que
  // seja, salta logo para o ponto seguinte (ou anterior) — o momento em que
  // esse marco já tem tudo no ecrã: título escrito, bullets, etiquetas e
  // pulso acabados. Pontos: cards de projetos -> 4 marcos -> fim da
  // Experience (ecrã limpo). Fora deste intervalo o scroll é o normal.
  const SNAP_LABELS = [
    "projectsFadeOut",
    "experienceReady",
    "expPoint1",
    "expPoint2",
    "expPoint3",
    "experienceEnd",
  ];
  if (tl.scrollTrigger && SNAP_LABELS.every((l) => l in tl.labels)) {
    const TOL = 2; // px de tolerância
    const JUMP_MS = 2200; // duração de cada salto = ritmo das animações (maior = mais lento)
    const LOCK_MS = 1000; // durante este tempo, a cauda da inércia é ignorada
    const MIN_GAP = 400; // tempo mínimo entre dois saltos seguidos
    const EXTRA_PX = 100; // scroll "a sério" que conta como novo gesto
    const NOTCH_PX = 40; // só eventos deste tamanho contam (a cauda da inércia é pequena)
    // easeOutQuad: arranca logo ao toque (sem "atraso" inicial) mas com uma
    // desaceleração suave e repartida pelo salto todo (em vez de gastar quase
    // tudo no início), por isso as animações da timeline passam ao ritmo certo
    const ease = (t) => 1 - (1 - t) * (1 - t);
    const getPts = () => SNAP_LABELS.map((l) => tl.scrollTrigger.labelToScroll(l));

    // Ponto para onde ir a partir da posição atual, na direção d (1 = a
    // descer, -1 = a subir). Devolve null quando estamos fora do intervalo
    // (aí o scroll normal do Lenis fica a tratar de tudo)
    // Se um salto ainda vai a caminho, parte do destino dele (assim dá para
    // encadear: um novo scroll durante o salto segue logo para o ponto a
    // seguir, sem esperar que o anterior acabe)
    function stepTarget(d) {
      const pts = getPts();
      const y = performance.now() < animEnd ? currentTarget : lenis.scroll;
      const last = pts[pts.length - 1];
      if (d > 0) {
        if (y < pts[0] - TOL || y >= last - TOL) return null;
        const t = pts.find((p) => p > y + TOL);
        return t === undefined ? null : t;
      }
      if (y <= pts[0] + TOL || y > last + TOL) return null;
      const t = [...pts].reverse().find((p) => p < y - TOL);
      return t === undefined ? null : t;
    }

    let lockUntil = 0; // cauda da inércia do gesto que provocou o salto
    let animEnd = 0; // quando o salto atual acaba
    let currentTarget = 0; // destino do salto atual
    let jumpDir = 0;
    let lastJumpAt = 0;
    let lastUserInput = 0; // último gesto do utilizador (roda/toque/teclado)
    function jump(target) {
      const now = performance.now();
      const chained = now < animEnd; // já ia a meio de outro salto
      jumpDir = target > (chained ? currentTarget : lenis.scroll) ? 1 : -1;
      lockUntil = now + LOCK_MS;
      animEnd = now + JUMP_MS;
      lastJumpAt = now;
      currentTarget = target;
      lenis.scrollTo(target, {
        duration: JUMP_MS / 1000,
        easing: ease,
        force: true,
      });
    }

    // Roda / trackpad. Em capture + stopImmediatePropagation para o Lenis
    // não chegar a ver o evento dentro do intervalo. Uma "nova" rodada só
    // conta depois de uma pequena pausa (ou mudança de direção), para a
    // inércia do trackpad não saltar vários pontos de seguida
    let lastWheel = 0;
    let lastWheelDir = 0;
    let gestureHandled = false; // este gesto já provocou um salto?
    let extraScroll = 0; // scroll acumulado depois do salto acabar
    let recentPx = []; // tamanho dos últimos eventos da roda
    let gesturePeak = 0; // maior evento do gesto atual
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) return; // pinch-zoom
        const d = Math.sign(e.deltaY);
        if (!d) return;
        const now = performance.now();
        lastUserInput = now;
        const fresh = now - lastWheel > 100 || d !== lastWheelDir;
        lastWheel = now;
        lastWheelDir = d;
        if (fresh) {
          gestureHandled = false;
          extraScroll = 0;
          recentPx = [];
          gesturePeak = 0;
        }
        // Resto da inércia de um gesto que já saltou: engole tudo (mesmo
        // quando o salto acabou de chegar ao limite do intervalo), para o
        // Lenis não continuar a andar por cima do salto. Mas se o salto já
        // acabou e continuas a fazer scroll a sério (mais de ~250px sem
        // pausa, bem mais do que a cauda de uma inércia), conta como um
        // novo gesto — senão, a rolar sem parar, o site ficava parado
        const px = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1);
        const prevMax = recentPx.length ? Math.max(...recentPx) : 0;
        gesturePeak = Math.max(gesturePeak, px);
        recentPx.push(px);
        if (recentPx.length > 4) recentPx.shift();
        if (gestureHandled) {
          if (now >= lockUntil) {
            // A cauda da inércia decai (eventos pequenos): ignora. Conta como
            // novo gesto se voltares a acelerar, ou se continuares a rolar
            // com eventos "de roda" (>= NOTCH_PX) até somar EXTRA_PX
            if (px >= Math.max(NOTCH_PX, gesturePeak * 0.35)) extraScroll += px;
            const reaccel = prevMax > 0 && px > 30 && px > prevMax * 1.6;
            if (extraScroll > EXTRA_PX || reaccel) {
              gestureHandled = false;
              extraScroll = 0;
            }
          }
          if (gestureHandled) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
        }
        const target = stepTarget(d);
        if (target === null) {
          // Já a caminho do fim da Experience: não deixa o scroll normal
          // interromper o salto
          if (now < animEnd && d === jumpDir) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        if (now - lastJumpAt >= MIN_GAP) {
          gestureHandled = true;
          extraScroll = 0;
          jump(target);
        }
      },
      { passive: false, capture: true }
    );

    // Teclado (setas, Page Up/Down, espaço)
    window.addEventListener(
      "keydown",
      (e) => {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        let d = 0;
        if (e.key === "ArrowDown" || e.key === "PageDown") d = 1;
        else if (e.key === "ArrowUp" || e.key === "PageUp") d = -1;
        else if (e.key === " ") d = e.shiftKey ? -1 : 1;
        if (!d) return;
        lastUserInput = performance.now();
        const target = stepTarget(d);
        if (target === null) return;
        e.preventDefault();
        if (performance.now() - lastJumpAt >= MIN_GAP) jump(target);
      },
      true
    );

    // Toque (telemóvel): um gesto = um salto
    let touchY0 = null;
    let touchDone = false;
    let touching = false;
    window.addEventListener(
      "touchstart",
      (e) => {
        touching = true;
        touchY0 = e.touches[0].clientY;
        touchDone = false;
      },
      { passive: true, capture: true }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (touchY0 === null) return;
        const dy = touchY0 - e.touches[0].clientY;
        const d = Math.sign(dy);
        if (!d) return;
        lastUserInput = performance.now();
        const target = stepTarget(d);
        if (target === null) return;
        if (e.cancelable) e.preventDefault();
        if (Math.abs(dy) > 12 && !touchDone && performance.now() - lastJumpAt >= MIN_GAP) {
          touchDone = true;
          jump(target);
        }
      },
      { passive: false, capture: true }
    );
    window.addEventListener(
      "touchend",
      () => {
        touching = false;
        touchY0 = null;
        scheduleSnap();
      },
      { passive: true, capture: true }
    );

    // Rede de segurança: se por algum motivo o scroll parar entre dois
    // pontos (arrastar a barra de scroll, inércia a entrar no intervalo...),
    // depois de uma pausa leva-o ao ponto seguinte na direção em que ia
    let snapTimer = null;
    let lastScroll = 0;
    let dir = 1;
    function scheduleSnap() {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (touching || performance.now() < animEnd) return;
        // Já está num ponto de descanso: não faz nada
        if (getPts().some((p) => Math.abs(p - lenis.scroll) <= TOL)) return;
        const target = stepTarget(dir);
        if (target !== null) jump(target);
      }, 150);
    }
    // Entrada no intervalo vinda da inércia do scroll normal (ex.: a passar
    // da secção anterior): em vez de deixar o Lenis "escorregar" para o meio
    // de uma transição, trava logo no primeiro ponto (cards) ao entrar a
    // descer, ou no último marco ao entrar a subir pelo fim
    let ptsCache = getPts();
    ScrollTrigger.addEventListener("refresh", () => (ptsCache = getPts()));
    lenis.on("scroll", ({ scroll }) => {
      const prev = lastScroll;
      if (scroll > lastScroll) dir = 1;
      else if (scroll < lastScroll) dir = -1;
      lastScroll = scroll;

      // Só quando a inércia vem de um gesto do utilizador (não dos links da
      // barra de navegação, que atravessam o intervalo de propósito)
      if (performance.now() >= animEnd && performance.now() - lastUserInput < 1500) {
        const first = ptsCache[0];
        const last = ptsCache[ptsCache.length - 1];
        if (prev < first - TOL && scroll >= first - TOL && dir > 0) {
          gestureHandled = true;
          jump(first);
          return;
        }
        if (prev > last + TOL && scroll <= last + TOL && dir < 0) {
          gestureHandled = true;
          jump(ptsCache[ptsCache.length - 2]);
          return;
        }
      }
      scheduleSnap();
    });
  }

  // Reforço do efeito de hover dos cards via JS (além do :hover no CSS),
  // para garantir que funciona mesmo que algum detalhe do browser impeça
  // o :hover de disparar corretamente
  document.querySelectorAll(".project-entry").forEach((card) => {
    card.addEventListener("pointerenter", () => {
      card.classList.add("is-hovering");
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-hovering");
    });
  });

  // Clique nos links da barra de navegação — usa o lenis.scrollTo (em vez do
  // salto nativo do href="#...") para o scroll suave não entrar em conflito.
  // O "Who I Am" é um caso especial: já não é uma secção normal, faz parte
  // da timeline pinned, por isso o scroll tem de ir para a posição exata
  // dessa label dentro do pin, em vez de ir para um elemento normal.
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");

      if (targetId === "#who-i-am") {
        const scrollPos = tl.scrollTrigger.labelToScroll("whoTitleVisible");
        lenis.scrollTo(scrollPos, { duration: 1.4 });
      } else if (targetId === "#projects") {
        const scrollPos = tl.scrollTrigger.labelToScroll("projectsReveal");
        lenis.scrollTo(scrollPos, { duration: 1.4 });
      } else if (targetId === "#experience") {
        // Agora faz parte da timeline pinned, por isso vai para a posição
        // exata em que o título e a linha já estão visíveis
        const scrollPos = tl.scrollTrigger.labelToScroll("experienceReady");
        lenis.scrollTo(scrollPos, { duration: 1.4 });
      } else {
        lenis.scrollTo(targetId, { offset: -70, duration: 1.4 });
      }
    });
  });
  }); // fim do document.fonts.ready.then
});