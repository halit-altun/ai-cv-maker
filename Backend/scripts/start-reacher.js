/**
 * Backend `npm run dev` ile birlikte Reacher Docker container'ını ayağa kaldırır.
 * Zaten çalışıyorsa dokunmaz; Docker yoksa uyarı verir ve backend'e devam eder.
 */
const { spawnSync } = require("child_process");

const CONTAINER_NAME = process.env.REACHER_CONTAINER_NAME || "cv-ai-reacher";
const IMAGE = process.env.REACHER_DOCKER_IMAGE || "reacherhq/backend";
const HOST_PORT = String(process.env.REACHER_HOST_PORT || "8080");

function run(cmd, opts = {}) {
  return spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    ...opts,
  });
}

function dockerAvailable() {
  const result = run("docker info", { stdio: "pipe" });
  return result.status === 0;
}

function containerState() {
  const result = run(
    `docker inspect -f "{{.State.Running}}" ${CONTAINER_NAME}`,
    { stdio: "pipe" }
  );
  if (result.status !== 0) return "missing";
  const out = String(result.stdout || "").trim().toLowerCase();
  if (out === "true") return "running";
  return "stopped";
}

function ensureReacher() {
  if (String(process.env.REACHER_AUTO_START || "true").toLowerCase() === "false") {
    console.log("[reacher] Auto-start kapalı (REACHER_AUTO_START=false).");
    return;
  }

  if (!dockerAvailable()) {
    console.warn(
      "[reacher] Docker bulunamadı veya çalışmıyor. MX-only doğrulama kullanılacak."
    );
    console.warn(
      `[reacher] Manuel: docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:8080 ${IMAGE}`
    );
    return;
  }

  const state = containerState();

  if (state === "running") {
    console.log(`[reacher] Zaten çalışıyor → http://127.0.0.1:${HOST_PORT}`);
    return;
  }

  if (state === "stopped") {
    console.log(`[reacher] Container başlatılıyor: ${CONTAINER_NAME}`);
    const start = run(`docker start ${CONTAINER_NAME}`, { stdio: "inherit" });
    if (start.status !== 0) {
      console.warn("[reacher] docker start başarısız — backend devam ediyor.");
      return;
    }
    console.log(`[reacher] Hazır → http://127.0.0.1:${HOST_PORT}`);
    return;
  }

  console.log(`[reacher] İlk kurulum: ${IMAGE} (port ${HOST_PORT})`);
  const create = run(
    `docker run -d --name ${CONTAINER_NAME} -p ${HOST_PORT}:8080 --restart unless-stopped ${IMAGE}`,
    { stdio: "inherit" }
  );

  if (create.status !== 0) {
    console.warn("[reacher] docker run başarısız — backend devam ediyor.");
    console.warn(
      "[reacher] Port meşgulse mevcut container'ı kontrol edin: docker ps -a"
    );
    return;
  }

  console.log(`[reacher] Hazır → http://127.0.0.1:${HOST_PORT}`);
}

try {
  ensureReacher();
} catch (err) {
  console.warn(
    "[reacher] Beklenmeyen hata:",
    err instanceof Error ? err.message : err
  );
}
