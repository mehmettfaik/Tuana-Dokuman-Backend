const { getFirestore } = require('../config/firebase');

// In-memory cache for forms is deprecated as we now use optimized queries
const invalidateFormsCache = () => {
  // Deprecated, no-op
};

const createForm = async (req, res) => {
  try {
    const db = getFirestore();
    
    console.log('Form kaydetme isteği:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    const { formData: rawFormData, goods: topGoods, formType, totals, rolls: topRolls, rows: topRows } = req.body;
    const formData = rawFormData || {};
    const goods = topGoods || formData.goods || [];
    const rolls = topRolls || formData.rolls || [];
    const rows = topRows || formData.rows || []; 
    

    // Validation
    if (!formType || !formData) {
      return res.status(400).json({
        error: true,
        message: 'formType ve formData alanları gerekli',
        code: 'VALIDATION_ERROR'
      });
    }

    const normalizedFormData = { ...formData };
    if (!normalizedFormData.goods && goods.length > 0) {
      normalizedFormData.goods = goods;
    }
    if (!normalizedFormData.rolls && rolls.length > 0) {
      normalizedFormData.rolls = rolls;
    }
    if (!normalizedFormData.rows && rows.length > 0) {
      normalizedFormData.rows = rows;
    }

    const newForm = {
      formType,
      formData: normalizedFormData,
      goods: goods,
      rolls: rolls,
      rows: rows, 
      totals: totals || null,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('forms').add(newForm);
    
    invalidateFormsCache();

    // Response - ID ile birlikte tüm veriyi döndür
    const response = {
      id: docRef.id,
      ...newForm
    };
        
    res.status(201).json(response);

  } catch (error) {
    console.error(' Error saving form:', error);
    res.status(500).json({
      error: true,
      message: 'Form kaydedilemedi',
      code: 'SERVER_ERROR'
    });
  }
};

// GET /api/forms - Tüm form kayıtlarını listele
const getAllForms = async (req, res) => {
  try {
    const db = getFirestore();
    
    // Query parametreleri
    const { formType } = req.query;

    let snapshot;
    let fallbackUsed = false;
    
    // 1. Önce optimize edilmiş sorguyu deniyoruz (Sadece istenen formTipini çek, limit koy)
    try {
      let query = db.collection('forms');
      
      if (formType) {
        query = query.where('formType', '==', formType);
      }
      
      // En son eklenenleri getir ve maksimum 100 belge ile sınırla (Okuma maliyetini çok ciddi düşürür)
      query = query.orderBy('createdAt', 'desc').limit(100);
      snapshot = await query.get();
    } catch (err) {
      // Eğer Firebase'de composite index (where + orderBy) yoksa hata verir.
      // Bu durumda fallback olarak tüm belgeleri değil, sadece son 500 belgeyi çekip JavaScript'te filtreleriz.
      // (Index oluşturulduğunda otomatik olarak ilk blok çalışmaya başlar)
      if (err.message && err.message.includes('index')) {
        console.warn('⚠️ Firebase Index eksik! Fallback sorgusu kullanılıyor. Lütfen terminaldeki Firebase logunda yer alan linkten indexi oluşturun.');
        fallbackUsed = true;
        snapshot = await db.collection('forms').orderBy('createdAt', 'desc').limit(500).get();
      } else {
        throw err;
      }
    }

    if (!snapshot || snapshot.empty) {
      return res.json([]);
    }

    let forms = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      
      // Fallback kullanıldıysa ve formType istenmişse, uymayanları atla
      if (fallbackUsed && formType && data.formType !== formType) {
        return; // forEach içinde continue görevi görür
      }

      const goods = data.goods || (data.formData && data.formData.goods) || [];
      const rolls = data.rolls || (data.formData && data.formData.rolls) || [];
      const rows = data.rows || (data.formData && data.formData.rows) || []; 
      const formData = { ...(data.formData || {}) };
      
      if (!formData.goods && goods.length > 0) formData.goods = goods;
      if (!formData.rolls && rolls.length > 0) formData.rolls = rolls;
      if (!formData.rows && rows.length > 0) formData.rows = rows;

      forms.push({
        id: doc.id,
        formType: data.formType,
        formData,
        goods,
        rolls,
        rows,
        totals: data.totals || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
      });
    });

    // Fallback kullandıysak elimizdeki sonuçlar 100'ü geçmiş olabilir, 100 ile sınırlayalım
    if (fallbackUsed && forms.length > 100) {
      forms = forms.slice(0, 100);
    }

    res.json(forms);

  } catch (error) {
    console.error(' Error retrieving forms:', error);
    
    res.status(500).json({
      error: true,
      message: 'Formlar getirilemedi',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
};

// GET /api/forms/:formId - Tek bir form kaydını getir
const getFormById = async (req, res) => {
  try {
    const db = getFirestore();
    const { formId } = req.params;

    if (!formId) {
      return res.status(400).json({
        error: true,
        message: 'Form ID gerekli',
        code: 'VALIDATION_ERROR'
      });
    }

    const docRef = db.collection('forms').doc(formId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: true,
        message: 'Form bulunamadı',
        code: 'NOT_FOUND'
      });
    }

    // ID ile birlikte data döndür
    const data = doc.data() || {};    
    const goods = data.goods || (data.formData && data.formData.goods) || [];
    const rolls = data.rolls || (data.formData && data.formData.rolls) || [];
    const rows = data.rows || (data.formData && data.formData.rows) || []; // Çeki listesi için rows
    const formData = { ...(data.formData || {}) };
    if (!formData.goods && goods.length > 0) formData.goods = goods;
    if (!formData.rolls && rolls.length > 0) formData.rolls = rolls;
    if (!formData.rows && rows.length > 0) formData.rows = rows;

    // Return normalized shape so frontend always receives goods and formData.goods
    const response = {
      id: doc.id,
      formType: data.formType,
      formData,
      goods,
      rolls,
      rows, 
      totals: data.totals || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };
        
    res.json(response);

  } catch (error) {
    console.error(' Error retrieving form:', error);
    res.status(500).json({
      error: true,
      message: 'Form getirilemedi',
      code: 'SERVER_ERROR'
    });
  }
};

// DELETE /api/forms/:formId - Form kaydını sil
const deleteForm = async (req, res) => {
  try {
    const db = getFirestore();
    const { formId } = req.params;

    if (!formId) {
      return res.status(400).json({
        error: true,
        message: 'Form ID gerekli',
        code: 'VALIDATION_ERROR'
      });
    }

    const docRef = db.collection('forms').doc(formId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: true,
        message: 'Form bulunamadı',
        code: 'NOT_FOUND'
      });
    }

    await docRef.delete();
    
    invalidateFormsCache();

    console.log(` Deleted form ${formId} from Firestore`);

    res.json({
      success: true,
      message: 'Form başarıyla silindi',
      id: formId
    });

  } catch (error) {
    console.error(' Error deleting form:', error);
    res.status(500).json({
      error: true,
      message: 'Form silinemedi',
      code: 'SERVER_ERROR'
    });
  }
};

const bulkDeleteForms = async (req, res) => {
  try {
    const db = getFirestore();
    const { formIds } = req.body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'formIds array is required'
      });
    }

    const batch = db.batch();
    const deletedIds = [];

    for (const formId of formIds) {
      const docRef = db.collection('forms').doc(formId);
      batch.delete(docRef);
      deletedIds.push(formId);
    }

    await batch.commit();
    
    invalidateFormsCache();

    console.log(` Bulk deleted ${deletedIds.length} forms from Firestore`);

    res.json({
      success: true,
      message: 'Forms deleted successfully',
      count: deletedIds.length,
      deletedIds
    });

  } catch (error) {
    console.error(' Error bulk deleting forms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete forms',
      message: error.message
    });
  }
};

const getFormsStats = async (req, res) => {
  try {
    const db = getFirestore();
    
    // Aggregation query to securely and cheaply count total documents (costs 1 read instead of N reads)
    const countSnapshot = await db.collection('forms').count().get();
    const totalForms = countSnapshot.data().count;

    if (totalForms === 0) {
      return res.json({
        success: true,
        stats: {
          totalForms: 0,
          byDocumentType: {},
          recent: []
        }
      });
    }

    // Sadece son 100 dokümanı çekip type bazlı istatistik ve son eklenenleri oluşturuyoruz
    const snapshot = await db.collection('forms').orderBy('createdAt', 'desc').limit(100).get();

    const stats = {
      totalForms: totalForms,
      byDocumentType: {}, // Bu istatistik sadece son 100 form üzerinden yaklaşık (approximate) olacaktır.
      recent: []
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by document type in the recent 100 items
      const docType = data.documentType || data.formType || 'Unknown';
      stats.byDocumentType[docType] = (stats.byDocumentType[docType] || 0) + 1;
      
      if (stats.recent.length < 10) {
        stats.recent.push({
          id: doc.id,
          documentType: docType,
          createdAt: data.createdAt
        });
      }
    });

    console.log(`Retrieved stats for ${stats.totalForms} total forms`);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error retrieving stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats',
      message: error.message
    });
  }
};

module.exports = {
  createForm,
  getAllForms,
  getFormById,
  deleteForm,
  bulkDeleteForms,
  getFormsStats
};
