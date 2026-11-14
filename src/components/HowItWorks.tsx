export function HowItWorks() {
  return (
    <article className="card prose">
      <h2>How the simulation works</h2>
      <p>
        A PC is a pipeline: the slowest stage sets the pace and the faster parts wait. PC Harmony estimates how
        long each part makes the others wait for the workloads you choose, and flags pairings where you are paying for
        performance you can't use.
      </p>

      <h3>1. Will it work at all? (compatibility)</h3>
      <ul>
        <li><b>CPU ↔ motherboard</b>: socket, memory type, and whether the board's power delivery (VRM) can feed the CPU.</li>
        <li><b>RAM</b>: DDR4 vs DDR5, number of slots, maximum capacity and the speed the platform will actually run.</li>
        <li><b>Cooler</b>: heat it can remove vs the CPU's power, plus height / radiator clearance in the case.</li>
        <li><b>Power supply</b>: estimated peak draw, headroom for GPU power spikes, 12V-2x6 connector.</li>
        <li><b>Case</b>: motherboard size and graphics-card length.</li>
      </ul>

      <h3>2. Will it work well? (bottlenecks)</h3>
      <p><b>Gaming</b> uses a frame-rate model. Every CPU has a ceiling — the most frames it can prepare per second — and it hardly changes with resolution. Every GPU has a ceiling that drops steeply as resolution rises. You get roughly the lower of the two.</p>
      <ul>
        <li>CPU ceiling = CPU gaming index × workload factor × memory factor (single-channel RAM, slow RAM, too little RAM).</li>
        <li>GPU ceiling = GPU index × workload factor × resolution scale × VRAM factor × PCIe factor.</li>
        <li>Being slightly <b>GPU-limited is ideal</b>: you get all of the GPU you paid for, and the CPU has headroom for heavy scenes. Being <b>CPU-limited</b> means part of the GPU sits idle.</li>
      </ul>
      <p><b>Creator, AI and everyday</b> workloads use a time-share model: the job's time is split between CPU, GPU, RAM and storage (e.g. video editing ≈ 50% CPU, 28% GPU, 14% RAM, 8% storage on a top-end PC). A weaker part stretches its share. The verdict compares the CPU's class to the GPU's class, and checks that RAM, storage and VRAM are simply <em>enough</em>.</p>

      <h3>3. Harmony score</h3>
      <p>Each workload gets a 0–100 balance score. The overall score leans toward your worst workload, so one bad fit isn't hidden by an average.</p>

      <h3>How accurate is it?</h3>
      <p>
        Performance indices are relative values approximated from aggregated public reviews; the model is tuned to land within roughly
        10–15% of real-world averages for typical games and apps. Individual games vary a lot (some are extremely CPU-heavy, others
        GPU-heavy), so treat results as guidance for <em>which parts suit each other</em>, not as exact FPS promises.
      </p>
      <p className="muted small">Prices are not included yet. The auto-builder uses "least powerful part that meets the target" as a stand-in for "cheapest".</p>
    </article>
  );
}
