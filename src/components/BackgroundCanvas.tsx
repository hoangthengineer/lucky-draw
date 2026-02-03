import { useEffect, useRef } from 'react'

function createCtx(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let ctx = createCtx(canvas)
    if (!ctx) return

    let animationFrameId: number

    const cols: { x: number; y: number; speed: number; width: number }[] = []
    const particles: { x: number; y: number; r: number; speed: number; alpha: number }[] = []

    const initScene = () => {
      if (!canvas) return
      const { width, height } = canvas.getBoundingClientRect()
      cols.length = 0
      particles.length = 0

      const colCount = Math.round(width / 80)
      for (let i = 0; i < colCount; i += 1) {
        const x = (i + 0.5) * (width / colCount)
        cols.push({
          x,
          y: Math.random() * height,
          speed: 40 + Math.random() * 60,
          width: 1.5 + Math.random() * 1.5,
        })
      }

      const particleCount = Math.round(width / 18)
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 1 + Math.random() * 2.2,
          speed: 8 + Math.random() * 18,
          alpha: 0.35 + Math.random() * 0.4,
        })
      }
    }

    initScene()

    let lastTime = performance.now()

    const render = (time: number) => {
      if (!canvas || !ctx) return
      const { width, height } = canvas.getBoundingClientRect()
      const dt = (time - lastTime) / 1000
      lastTime = time

      ctx.clearRect(0, 0, width, height)

      // vertical light columns
      for (const col of cols) {
        col.y += col.speed * dt
        if (col.y > height + 80) col.y = -80

        const grad = ctx.createLinearGradient(col.x, col.y - 80, col.x, col.y + 40)
        grad.addColorStop(0, 'rgba(59, 130, 246, 0)')
        grad.addColorStop(0.35, 'rgba(59, 130, 246, 0.3)')
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.6)')
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)')

        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.strokeStyle = grad
        ctx.lineWidth = col.width
        ctx.beginPath()
        ctx.moveTo(col.x, col.y - 80)
        ctx.lineTo(col.x, col.y + 40)
        ctx.stroke()
        ctx.restore()
      }

      // floating particles / pixels
      for (const p of particles) {
        p.y += p.speed * dt
        if (p.y > height + 10) p.y = -10

        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        gradient.addColorStop(0, `rgba(191, 219, 254, ${p.alpha})`)
        gradient.addColorStop(1, 'rgba(191, 219, 254, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationFrameId = window.requestAnimationFrame(render)
    }

    animationFrameId = window.requestAnimationFrame(render)

    const handleResize = () => {
      const newCtx = createCtx(canvas)
      if (!newCtx) return
      ctx = newCtx
      initScene()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="bg-canvas" />
}

