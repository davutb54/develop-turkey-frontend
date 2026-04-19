import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modüllerinde __dirname bulunmadığı için manuel tanımlıyoruz
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const msdeployPath = '"C:\\Program Files\\IIS\\Microsoft Web Deploy V3\\msdeploy.exe"';

try {
    console.log("🚀 Build başlatılıyor...");
    execSync('npm run build', { stdio: 'inherit' });

    console.log("📦 Sunucuya gönderiliyor...");
    const cmd = `${msdeployPath} -verb:sync -source:contentPath='${__dirname}\\dist' -dest:contentPath='${process.env.DEPLOY_SITE}',computerName='https://${process.env.DEPLOY_IP}:8172/msdeploy.axd',userName='${process.env.DEPLOY_USER}',password='${process.env.DEPLOY_PASS}',authtype='Basic' -allowUntrusted`;

    execSync(cmd, { stdio: 'inherit' });
    console.log("✅ Yayınlama başarıyla tamamlandı!");
} catch (error) {
    console.error("❌ Bir hata oluştu:", error.message);
}