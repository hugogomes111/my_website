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
        // Foi aumentado de 2700% porque adicionámos mais conteúdo à timeline
        // (os cards de projetos) — isto mantém o mesmo ritmo de scroll do
        // resto da timeline e ainda dá um pouco de "folga" no fim para os
        // cards ficarem visíveis antes de se avançar para a secção Experience.
        // Se ajustares a duração das animações dos cards, o ideal é
        // reajustar este valor um pouco também.
        end: "+=4100%",
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
  tl.addLabel("projectsZoomStart", "projectsReveal+=2.5");

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

  tl.addLabel("projectsEnd", "projectsZoomStart+=4");

  // 7. Depois do zoom, o título ("j" gigante) esvai-se e dá lugar a uns
  // cards ilustrativos com os projetos, ainda sobre a mesma imagem de fundo
  tl.to(
    projTitle,
    { autoAlpha: 0, duration: 1 },
    "projectsEnd+=0.3"
  );

  tl.addLabel("projectsListReveal", "projectsEnd+=1.3");

  tl.to(
    ".project-list",
    { autoAlpha: 1, duration: 1 },
    "projectsListReveal"
  );

  // Cada card entra com um pequeno atraso em relação ao anterior (stagger),
  // em vez de todos aparecerem ao mesmo tempo
  tl.fromTo(
    ".project-entry",
    { y: 30, autoAlpha: 0 },
    {
      y: 0,
      autoAlpha: 1,
      duration: 1,
      stagger: 0.18,
    },
    "projectsListReveal+=0.2"
  );

  tl.addLabel("projectsListEnd", "projectsListReveal+=3");

  // Depois do ScrollTrigger recalcular tudo (o momento em que a posição
  // costuma "saltar" num refresh), força outra vez o scroll ao topo
  ScrollTrigger.addEventListener("refresh", () =>
    lenis.scrollTo(0, { immediate: true })
  );
  ScrollTrigger.refresh();

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
      } else {
        lenis.scrollTo(targetId, { offset: -70, duration: 1.4 });
      }
    });
  });
  }); // fim do document.fonts.ready.then
});