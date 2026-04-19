import * as THREE from 'three';

// UIパネルを生成して返す関数をエクスポート（公開）する
export function createUIPanel(type, data = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 10, 20, 0.8)';
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1004, 492);
    ctx.textAlign = 'center';
    
    if (type === 'START') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 90px sans-serif';
        ctx.fillText('ASTRO SCULPTOR', 512, 180);
        
        ctx.shadowColor = '#00ffff'; ctx.font = '30px sans-serif';
        ctx.fillText('―― 宇宙の彫刻家 ――', 512, 240);

        ctx.shadowBlur = 15; ctx.shadowColor = '#00ff00';
        ctx.fillStyle = '#00aa00'; ctx.fillRect(362, 320, 300, 80);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
        ctx.fillText('START', 512, 375);
    } else if (type === 'RESULT') {
        ctx.shadowBlur = 20; ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffdd00'; ctx.font = 'bold 80px sans-serif';
        ctx.fillText('STAGE CLEAR!', 512, 120);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff'; ctx.font = '40px sans-serif';
        ctx.fillText(`CLEAR TIME: ${data.time} sec`, 512, 220);
        
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff00ff';
        ctx.fillStyle = '#ff88ff'; ctx.font = 'bold 70px sans-serif';
        ctx.fillText(`RANK: ${data.rank}`, 512, 300);

        ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00aaaa'; ctx.fillRect(362, 380, 300, 80);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
        ctx.fillText('REPLAY', 512, 435);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), mat);
}