import express from 'express';
import Account from '../models/Account.js';
import Video, { CATEGORIES } from '../models/Video.js';
import Adjustment from '../models/Adjustment.js'; // <-- добавили
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.get('/overview', async (req, res, next) => {
  try {
    const videos = await Video.find();
    const accounts = await Account.find();
    const adjustments = await Adjustment.find();

    let totalViews = 0;
    let totalExpected = 0;
    let totalExpenses = 0;
    let totalPaidFromVideos = 0;
    let totalAdjustments = 0;

    const byAccount = {};

    videos.forEach(v => {
      totalViews += v.views || 0;
      totalExpenses += v.totalExpenses || 0;
      const net = (v.grossRevenue || 0) - (v.totalExpenses || 0);

      if (v.status === 'paid') {
        totalPaidFromVideos += net;
      } else if (v.status !== 'rejected') {
        totalExpected += net;
      }

      const k = String(v.account);
      byAccount[k] = byAccount[k] || { views: 0, revenue: 0, count: 0 };
      byAccount[k].views += v.views || 0;
      if (v.status === 'paid') byAccount[k].revenue += net;
      byAccount[k].count += 1;
    });

    adjustments.forEach(a => {
      totalAdjustments += a.amountUsd || 0;
    });

    const accountRows = accounts.map(a => {
      const agg = byAccount[String(a._id)] || { views: 0, revenue: 0, count: 0 };
      return {
        _id: a._id,
        name: a.name,
        videos: agg.count,
        views: agg.views,
        revenue: +agg.revenue.toFixed(2),
      };
    });

    res.json({
      totalVideos: videos.length,
      totalViews,
      totalGross: +totalExpected.toFixed(2),
      totalExpenses: +totalExpenses.toFixed(2),
      totalPaidFromVideos: +totalPaidFromVideos.toFixed(2),
      totalAdjustments: +totalAdjustments.toFixed(2),
      totalRevenue: +(totalPaidFromVideos + totalAdjustments).toFixed(2), // это идет в карточку "Выплачено"
      categories: CATEGORIES,
      accounts: accountRows,
    });
  } catch (e) {
    next(e);
  }
});

export default router;