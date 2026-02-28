# تعليمات إصلاح المشاكل

## المشاكل التي واجهناها:
1. ✅ **404 Error** - تم إصلاحه بإنشاء `app/layout.tsx`
2. ✅ **Turbopack cache corrupted** - تم حذف `.next` folder
3. ⚠️ **SQLite database locked** - يحتاج إيقاف الخادم أولاً

## خطوات الإصلاح الكاملة:

### 1. إيقاف الخادم
اضغط `Ctrl+C` في Terminal لإيقاف الخادم

### 2. تنظيف الكاش
```bash
# حذف مجلد .next
Remove-Item -Recurse -Force .next

# حذف قاعدة البيانات التالفة
Remove-Item prisma\dev.db -Force
Remove-Item prisma\dev.db-shm -Force -ErrorAction SilentlyContinue
Remove-Item prisma\dev.db-wal -Force -ErrorAction SilentlyContinue
```

### 3. إعادة إنشاء قاعدة البيانات
```bash
# إنشاء قاعدة البيانات من جديد
npm run db:migrate

# ملء قاعدة البيانات بالبيانات الأولية
npm run db:seed
```

### 4. إعادة تشغيل الخادم
```bash
npm run dev
```

### 5. الوصول للتطبيق
- `http://localhost:3000` (سيتم التوجيه تلقائياً)
- `http://localhost:3000/en/login`
- `http://localhost:3000/ar/login`

## بيانات تسجيل الدخول:
- **Admin**: `admin@example.com` / `Admin123!`
- **Employee**: `employee@example.com` / `Employee123!`

## ملاحظات:
- إذا استمرت مشكلة "database is locked"، تأكد من إيقاف جميع عمليات Node.js
- يمكنك استخدام Task Manager لإيقاف جميع عمليات `node.exe`
- أو أعد تشغيل الكمبيوتر إذا لزم الأمر
