# سكريبت إصلاح المشاكل
Write-Host "Starting fix process..." -ForegroundColor Cyan

# 1. إيقاف العمليات
Write-Host "`n1. Stopping Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# 2. حذف .next
Write-Host "2. Deleting .next folder..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "   .next deleted" -ForegroundColor Green
} else {
    Write-Host "   .next not found" -ForegroundColor Gray
}

# 3. حذف قاعدة البيانات
Write-Host "3. Deleting database files..." -ForegroundColor Yellow
if (Test-Path prisma\dev.db) {
    Remove-Item prisma\dev.db -Force
    Write-Host "   dev.db deleted" -ForegroundColor Green
}
if (Test-Path prisma\dev.db-shm) {
    Remove-Item prisma\dev.db-shm -Force -ErrorAction SilentlyContinue
}
if (Test-Path prisma\dev.db-wal) {
    Remove-Item prisma\dev.db-wal -Force -ErrorAction SilentlyContinue
}

# 4. إنشاء قاعدة البيانات
Write-Host "4. Creating database..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Database created" -ForegroundColor Green
} else {
    Write-Host "   Database creation failed" -ForegroundColor Red
    exit 1
}

# 5. ملء البيانات
Write-Host "5. Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Database seeded" -ForegroundColor Green
} else {
    Write-Host "   Seeding failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll done! You can now run: npm run dev" -ForegroundColor Green
