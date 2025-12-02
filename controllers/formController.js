const { getFirestore } = require('../config/firebase');

// POST /api/forms - Yeni form kaydı oluştur
const createForm = async (req, res) => {
  try {
    const db = getFirestore();
    
    
    // Support goods sent either as top-level `goods` or nested in `formData.goods`
    const { formData: rawFormData, goods: topGoods, formType, totals, rolls: topRolls } = req.body;
    const formData = rawFormData || {};
    const goods = topGoods || formData.goods || [];
    const rolls = topRolls || formData.rolls || [];
    
    

    // Validation
    if (!formType || !formData) {
      return res.status(400).json({
        error: true,
        message: 'formType ve formData alanları gerekli',
        code: 'VALIDATION_ERROR'
      });
    }

    // Yeni form objesi oluştur
    // Ensure formData does not carry duplicate goods property (we'll normalize)
    const normalizedFormData = { ...formData };
    if (!normalizedFormData.goods && goods.length > 0) {
      // keep a copy in formData for frontends that expect nested goods
      normalizedFormData.goods = goods;
    }
    if (!normalizedFormData.rolls && rolls.length > 0) {
      // keep a copy in formData for frontends that expect nested rolls
      normalizedFormData.rolls = rolls;
    }

    const newForm = {
      formType,
      formData: normalizedFormData,
      goods: goods,
      rolls: rolls,
      totals: totals || null,
      createdAt: new Date().toISOString()
    };

    // Firestore'a kaydet
    const docRef = await db.collection('forms').add(newForm);

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

    // Sadece createdAt'e göre sırala (index gerektirmez)
    let query = db.collection('forms').orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.json([]);
    }

    let forms = [];
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      // Normalize goods: support top-level goods or nested formData.goods
      const goods = data.goods || (data.formData && data.formData.goods) || [];
      const rolls = data.rolls || (data.formData && data.formData.rolls) || [];
      const formData = { ...(data.formData || {}) };
      if (!formData.goods && goods.length > 0) formData.goods = goods;
      if (!formData.rolls && rolls.length > 0) formData.rolls = rolls;

      forms.push({
        id: doc.id,
        formType: data.formType,
        formData,
        goods,
        rolls,
        totals: data.totals || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
      });
    });

    // formType filter varsa client-side filtering yap
    if (formType) {
      forms = forms.filter(form => form.formType === formType);
    }

    // Direkt array döndür
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
    const formData = { ...(data.formData || {}) };
    if (!formData.goods && goods.length > 0) formData.goods = goods;
    if (!formData.rolls && rolls.length > 0) formData.rolls = rolls;

    // Return normalized shape so frontend always receives goods and formData.goods
    const response = {
      id: doc.id,
      formType: data.formType,
      formData,
      goods,
      rolls,
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

    // Önce form'un var olup olmadığını kontrol et
    const docRef = db.collection('forms').doc(formId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        error: true,
        message: 'Form bulunamadı',
        code: 'NOT_FOUND'
      });
    }

    // Form'u sil
    await docRef.delete();

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

// Bulk delete - Bonus feature
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

// Statistics endpoint - Bonus feature
const getFormsStats = async (req, res) => {
  try {
    const db = getFirestore();
    
    const snapshot = await db.collection('forms').get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        stats: {
          totalForms: 0,
          byDocumentType: {},
          recent: []
        }
      });
    }

    const stats = {
      totalForms: snapshot.size,
      byDocumentType: {},
      recent: []
    };

    const allForms = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      allForms.push({
        id: doc.id,
        ...data
      });

      // Count by document type
      const docType = data.documentType || 'Unknown';
      stats.byDocumentType[docType] = (stats.byDocumentType[docType] || 0) + 1;
    });

    // Get recent forms (last 10)
    stats.recent = allForms
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(form => ({
        id: form.id,
        documentType: form.documentType,
        createdAt: form.createdAt
      }));

    console.log(`Retrieved stats for ${stats.totalForms} forms`);

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
