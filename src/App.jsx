import { useEffect, useState } from 'react'
import './App.css'

const links = [
  { id: 'price-list', icon: '💜', text: 'Price List', href: 'https://docs.google.com/spreadsheets/d/1Akr_wwyNCsMjfKLsEINCNU54Ln61kXM2cfxhKUVwLuk/edit?gid=0#gid=0' },
  { id: 'whatsapp-community', icon: '💬', text: 'Join Community', href: 'https://chat.whatsapp.com/HJLbXPLhu8b9TdRUsQwOrA' },
  { id: 'e-guides', icon: '📘', text: 'Electronic Guides', href: 'https://drive.google.com/drive/folders/1tNuXfOSXyQyyck7BK-BqZNIbvNBpLgXR' },
  { id: 'coa', icon: '📋', text: 'COA', href: 'https://drive.google.com/drive/folders/18cfTEy6FIXlJTcrxoPpeRlr-BzbTG4Kn' },
]

const adminLinks = [
  { id: 'admin-phoebe', text: 'Admin Phoebe', href: 'https://api.whatsapp.com/send?phone=639686450947' },
  { id: 'admin-glia', text: 'Admin Glia', href: 'https://api.whatsapp.com/send?phone=639062364792' },
  { id: 'admin-james', text: 'Admin James', href: 'https://api.whatsapp.com/send?phone=639054620846' },
  { id: 'admin-danica', text: 'Admin Danica', href: 'https://api.whatsapp.com/send?phone=639302121321' },
  { id: 'admin-jonina', text: 'Admin Jonina', href: 'https://api.whatsapp.com/send?phone=639058429200' },
]

const products = [
  { id: "10AM.", name: "10AM. - 5-amino-1mq", price: 775.0 },
  { id: "2AD", name: "2AD - AOD-9604 2mg", price: 496.0 },
  { id: "2S10", name: "2S10 - SS-31 10mg", price: 694.4 },
  { id: "2S50", name: "2S50 - SS-31 50mg", price: 2356.0 },
  { id: "322", name: "322 - SLU-PP-322", price: 992.0 },
  { id: "3710", name: "3710 - LL37", price: 620.0 },
  { id: "50AM.", name: "50AM. - 5-amino-1mq", price: 992.0 },
  { id: "5AD", name: "5AD - AOD-9604 5mg", price: 682.0 },
  { id: "5AM.", name: "5AM. - 5-amino-1mq", price: 570.4 },
  { id: "AA10", name: "AA10", price: 62.0 },
  { id: "AA3", name: "AA3 - Acetic Acid Water 0.6%", price: 49.6 },
  { id: "AD5", name: "AD5 - Adamax", price: 1506.6 },
  { id: "AP2", name: "AP2 - Adipotide", price: 651.0 },
  { id: "AP5", name: "AP5 - Adipotide", price: 1283.4 },
  { id: "AU100", name: "AU100 - AHK-CU 100mg", price: 930.0 },
  { id: "AU50", name: "AU50 - AHK-CU 50mg", price: 434.0 },
  { id: "AUCG1G", name: "AUCG1G - Mica HIGHLY RECOMMENDS 💯 🔥 AHKCu Cosmetic Grade | 1 gram", price: 806.0 },
  { id: "BA10PH", name: "BA10PH - Mica's Top Pick 💯 🔥 BAPH pharma-grade bacteriostatic sterile water + 0.9% Benzyl Alcohol Custom pH level of 5.9 or 6.72 to 7.62", price: 105.4 },
  { id: "BA3PH", name: "BA3PH - Mica's Top Pick 💯 🔥 BAPH pharma-grade bacteriostatic sterile water + 0.9% Benzyl Alcohol Custom pH level of 5.9 or 6.72 to 7.62", price: 62.0 },
  { id: "BA5PH", name: "BA5PH - Mica's Top Pick 💯 🔥 BAPH pharma-grade bacteriostatic sterile water + 0.9% Benzyl Alcohol Custom pH level of 5.9 or 6.72 to 7.62", price: 74.4 },
  { id: "BB10", name: "BB10 - BPC 5mg + TB 5mg", price: 768.8 },
  { id: "BB20", name: "BB20 - Mica HIGHLY RECOMMENDS 💯 🔥 BPC 10mg + TB 10mg", price: 1388.8 },
  { id: "BBG70", name: "BBG70 - GLOW (BPC-157 + GHK-CU + TB500)", price: 1364.0 },
  { id: "BC10", name: "BC10", price: 539.4 },
  { id: "BC5", name: "BC5 - BPC-157", price: 409.2 },
  { id: "BR20", name: "BR20 - Bronchogen", price: 1134.6 },
  { id: "BT10", name: "BT10", price: 979.6 },
  { id: "BT5", name: "BT5 - TB-500", price: 576.6 },
  { id: "BW10-India", name: "BW10-India - Bacteriostatic Water for Injection (USP) 10ml Ampoules Made in India Not bottled — comes in sealed plastic ampoules for easy and clean use.", price: 200.0 },
  { id: "CA20", name: "CA20 - Cardiogen", price: 1134.6 },
  { id: "CBL60", name: "CBL60 - Cerebrolysin", price: 692.3333333333334 },
  { id: "CD5", name: "CD5 - CJC-1295 With dac", price: 1178.0 },
  { id: "CGL10", name: "CGL10 - Cagrilintide", price: 1277.2 },
  { id: "CGL5", name: "CGL5 - Cagrilintide", price: 880.4 },
  { id: "CH20", name: "CH20 - Chonluten", price: 1134.6 },
  { id: "CND10", name: "CND10 - CJC-1295 NO dac", price: 1240.0 },
  { id: "CND5", name: "CND5 - CJC-1295 NO dac", price: 607.6 },
  { id: "COR20", name: "COR20 - Cortagen", price: 1134.6 },
  { id: "CP10", name: "CP10 - CJC-1295 without DAC + IPA", price: 1395.0 },
  { id: "CRY20", name: "CRY20 - Crystalagen", price: 1134.6 },
  { id: "CS10", name: "CS10 - Cagrilintide + Semaglutide", price: 1488.0 },
  { id: "CS5", name: "CS5 - Cagrilintide + Semaglutide", price: 899.0 },
  { id: "CU100", name: "CU100", price: 403.0 },
  { id: "CU50", name: "CU50 - Mica HIGHLY RECOMMENDS 💯 🔥 GHK-CU (With Vanguard and Janoshik Lab Test)", price: 341.0 },
  { id: "CUCG1G", name: "CUCG1G - Mica HIGHLY RECOMMENDS 💯 🔥 GHKCu Cosmetic Grade | 1 gram", price: 434.0 },
  { id: "DHA20", name: "DHA20 - Dihexa", price: 14415.0 },
  { id: "DR5", name: "DR5 - Dermorphin", price: 496.0 },
  { id: "DS5", name: "DS5 - DSIP", price: 409.2 },
  { id: "E3K", name: "E3K - EPO", price: 868.0 },
  { id: "ET10", name: "ET10 - Epitalon", price: 446.4 },
  { id: "ET50", name: "ET50 - Mica HIGHLY RECOMMENDS 💯 🔥 Epitalon", price: 1085.0 },
  { id: "G10K", name: "G10K - HCG", price: 1209.0 },
  { id: "G5K", name: "G5K - HCG", price: 682.0 },
  { id: "G610", name: "G610 - GHRP-6 Acetate", price: 465.0 },
  { id: "G65", name: "G65 - GHRP-6 Acetate", price: 496.0 },
  { id: "G75", name: "G75 - HMG", price: 558.0 },
  { id: "GP", name: "GP - GLP-1", price: 768.8 },
  { id: "GTT", name: "GTT - Mica's FAVORITE 💯 🔥 Glutathione", price: 589.0 },
  { id: "H10", name: "H10 - HGH 191AA (Somatropin)", price: 496.0 },
  { id: "H15", name: "H15 - HGH 191AA (Somatropin)", price: 620.0 },
  { id: "HA5", name: "HA5 - Hyaluronic acid", price: 930.0 },
  { id: "HHB", name: "HHB - Mica's FAVORITE 💯 🔥 Healthy Hair Skin Nails Blend NIACINAMIDE 50mg THIAMINE HCL 50mg PANTOTHENIC ACID 25mg CHOLINE 10mg INOSITOL 10mg NIACIN 5mg BIOTIN 100mcg FOLIC ACID 100mcg RIBOFLAVIN 100mcg", price: 1736.0 },
  { id: "HU10", name: "HU10 - Humanin", price: 1612.0 },
  { id: "HX5", name: "HX5 - Hexarelin Acetate", price: 713.0 },
  { id: "IG01", name: "IG01 - IGF-1LR3", price: 396.8 },
  { id: "IG1", name: "IG1 - IGF-1", price: 1314.4 },
  { id: "IGD", name: "IGD - IGF-DES", price: 496.0 },
  { id: "IP10", name: "IP10", price: 589.0 },
  { id: "IP5", name: "IP5 - Ipamorelin", price: 390.6 },
  { id: "KLOW80", name: "KLOW80 - KLOW (CU50+TB10+BC10+KPV10)", price: 1736.0 },
  { id: "KPV10", name: "KPV10 - KPV", price: 558.0 },
  { id: "KPV5", name: "KPV5 - KPV", price: 434.0 },
  { id: "KS10", name: "KS10 - KissPeptin-10", price: 930.0 },
  { id: "KS5", name: "KS5 - KissPeptin-10 5 MG", price: 527.0 },
  { id: "LAX20", name: "LAX20 - Cartalax", price: 1134.6 },
  { id: "LC120", name: "LC120 - Lipo-C", price: 651.0 },
  { id: "LC216", name: "LC216 - Lipo-C with vitamins B12 • L-Carnitine 20mg • Arginine 20mg • Methionine 25mg • Inositol 50mg • Choline 50mg • B5 Dexpan 25mg • B6 25mg • B12 Methyl 1mg", price: 651.0 },
  { id: "LC526", name: "LC526 - FAT BLASTER LIPO-C L-Carnitine 300 mg/ml Methionine 25 mg/ml Inositol 50 mg/ml Choline 50 mg/ml Vitamin B12 1 mg/ml Vitamin B6 50 mg/ml NADH 50 mg/ml Lidocaine 0.1 % Benzyl Alcohol 2 %", price: 1345.4 },
  { id: "LC600", name: "LC600 - L-Carnitine 600mg", price: 725.4 },
  { id: "Lemon Bottle", name: "Lemon Bottle - Lemon Bottle", price: 589.0 },
  { id: "LI20", name: "LI20 - Livagen", price: 1134.6 },
  { id: "LL10", name: "LL10", price: 1556.2 },
  { id: "LL30", name: "LL30", price: 1829.0 },
  { id: "LL5", name: "LL5 - Liraglutide", price: 837.0 },
  { id: "MA10", name: "MA10 - Matrixyl", price: 372.0 },
  { id: "MACG1G", name: "MACG1G - Matrixyl Cosmetic Grade| 1 gram", price: 2604.0 },
  { id: "MAX20", name: "MAX20 - Prostamax", price: 1134.6 },
  { id: "MDT10", name: "MDT10 - Mazdutide", price: 1519.0 },
  { id: "ML10", name: "ML10 - MT-2 (Melanotan 2 Acetate)", price: 415.4 },
  { id: "MS10", name: "MS10 - MOTs-c", price: 527.0 },
  { id: "MS40", name: "MS40 - MOTs-c", price: 1426.0 },
  { id: "MT10", name: "MT10 - Melatonin", price: 465.0 },
  { id: "NJ100", name: "NJ100 - NAD+", price: 372.0 },
  { id: "NJ500", name: "NJ500 - Mica's FAVORITE 💯 🔥 NAD+ (With Vanguard and Janoshik Lab Test)", price: 620.0 },
  { id: "NP810", name: "NP810 - Snap-8", price: 427.8 },
  { id: "NS10", name: "NS10 - 0.9% Sodium Chloride Injection", price: 275.0 },
  { id: "NSK30", name: "NSK30 - NA SELANK AMIDATE", price: 1475.6 },
  { id: "NXA30", name: "NXA30 - NA SEMAX AMIDATE", price: 1475.6 },
  { id: "OT2", name: "OT2 - Mica HIGHLY RECOMMENDS 💯 🔥 Oxytocin", price: 372.0 },
  { id: "OV20", name: "OV20 - Ovagen", price: 1134.6 },
  { id: "P20", name: "P20 - Pinealon", price: 756.4 },
  { id: "P41", name: "P41 - Mica HIGHLY RECOMMENDS 💯 🔥 PT-141", price: 539.4 },
  { id: "PA20", name: "PA20 - Pancragen", price: 1134.6 },
  { id: "PDRN", name: "PDRN - PDRN Cosmetic Grade | 1 gram", price: 682.0 },
  { id: "PDRNSerum", name: "PDRNSerum - Pure PDRN Serum form 10 days use", price: 868.0 },
  { id: "PE10", name: "PE10 - PE 22-88", price: 806.0 },
  { id: "PI10", name: "PI10 - Pinealon", price: 576.6 },
  { id: "PNC27", name: "PNC27 - PNC 27", price: 768.8 },
  { id: "PNC27-10", name: "PNC27-10 - PNC 27", price: 1240.0 },
  { id: "PRO20", name: "PRO20 - Alpostadil", price: 1128.4 },
  { id: "PTD5", name: "PTD5 - PTD-DBM", price: 1984.0 },
  { id: "RA10", name: "RA10 - Ara-290", price: 496.0 },
  { id: "RT10", name: "RT10", price: 799.8 },
  { id: "RT15", name: "RT15", price: 985.8 },
  { id: "RT20", name: "RT20", price: 1147.0 },
  { id: "RT30", name: "RT30", price: 1426.0 },
  { id: "RT5", name: "RT5 - Retatrutide", price: 589.0 },
  { id: "SBH", name: "SBH - Mica's FAVORITE 💯 🔥 Super Human Blend L-ARGININE 110 MG, L-CITRULLINE 120 MG, L-LYSINE 70MG, L-GLUTAMINE 40 MG, L-TAURINE 60 MG, L-ORNITHINE 110 MG L-PROLINE 60 MG L-CARNITINE 220 MG NAC 75 MG", price: 985.8 },
  { id: "SG01", name: "SG01 - Whitening and Spot Fading Skinbooster", price: 372.0 },
  { id: "SG02", name: "SG02 - PDRN Skinbooster", price: 372.0 },
  { id: "SG03", name: "SG03 - Collagen Skinbooster", price: 496.0 },
  { id: "SG04", name: "SG04 - Pink Hyaluronic Acid Essence", price: 372.0 },
  { id: "SK10", name: "SK10", price: 558.0 },
  { id: "SK5", name: "SK5 - Mica HIGHLY RECOMMENDS 💯 🔥 Selank", price: 396.8 },
  { id: "SM10", name: "SM10", price: 564.2 },
  { id: "SM15", name: "SM15", price: 651.0 },
  { id: "SM2", name: "SM2 - Semaglutide", price: 502.2 },
  { id: "SM20", name: "SM20", price: 762.6 },
  { id: "SM30", name: "SM30", price: 899.0 },
  { id: "SM55", name: "SM55", price: 514.6 },
  { id: "SMO10", name: "SMO10 - Sermorelin Acetate", price: 899.0 },
  { id: "SMO5", name: "SMO5 - Sermorelin Acetate", price: 576.6 },
  { id: "SUR10", name: "SUR10 - Survodutide", price: 2201.0 },
  { id: "TA10", name: "TA10 - Mica's FAVORITE 💯 🔥 Thymosin Alpha-1", price: 1209.0 },
  { id: "TA5", name: "TA5 - Thymosin Alpha-1", price: 713.0 },
  { id: "TER10", name: "TER10 - Teriparatide", price: 1705.0 },
  { id: "THEMICABLEND", name: "THEMICABLEND - Mica HIGHLY RECOMMENDS 💯 🔥 KPV 10mg + GHKCu 50mg", price: 905.2 },
  { id: "TR10", name: "TR10 - Tirzepatide 10mg", price: 496.0 },
  { id: "TR15", name: "TR15 - Tirzepatide 15mg", price: 663.4 },
  { id: "TR20", name: "TR20 - Tirzepatide 20mg", price: 744.0 },
  { id: "TR30", name: "TR30 - Tirzepatide 30mg", price: 886.6 },
  { id: "TR40", name: "TR40 - Tirzepatide 40mg", price: 1066.4 },
  { id: "TR5", name: "TR5 - Tirzepatide 5mg", price: 403.0 },
  { id: "TR50", name: "TR50 - Tirzepatide 50mg", price: 1258.6 },
  { id: "TR60", name: "TR60 - Tirzepatide 60mg", price: 1506.6 },
  { id: "TSM10", name: "TSM10 - Tesamorelin", price: 1333.0 },
  { id: "TSM5", name: "TSM5 - Tesamorelin", price: 775.0 },
  { id: "TY10", name: "TY10 - Thymalin", price: 496.0 },
  { id: "VE20", name: "VE20 - Vesugen", price: 1134.6 },
  { id: "VI120", name: "VI120 - VILON", price: 1159.4 },
  { id: "VIP10", name: "VIP10 - Vasoactive Intestinal Peptide", price: 1085.0 },
  { id: "VIP5", name: "VIP5 - Vasoactive Intestinal Peptide", price: 682.0 },
  { id: "WA10", name: "WA10 - Phosphate Buffered Saline 10ml", price: 55.8 },
  { id: "WA3", name: "WA3 - Phosphate Buffered Saline 3ml", price: 43.4 },
  { id: "XA10", name: "XA10 - Mica HIGHLY RECOMMENDS 💯 🔥 Semax", price: 527.0 },
  { id: "XA5", name: "XA5 - Mica HIGHLY RECOMMENDS 💯 🔥 Semax", price: 341.0 },
  { id: "XS20", name: "XS20 - Semax 10mg + Selank 10mg", price: 930.0 },
  { id: "XT100", name: "XT100 - Botulinum toxin", price: 1215.2 },
]

const customerJourneyReviews = Array.from({ length: 50 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    id: `customer-journey-${number}`,
    src: `/reviews/customer-journey-${number}.jpg`,
    tag: 'Customer journey',
  }
})

const baseCustomerReviews = [
  {
    id: 'review-5836',
    src: '/reviews/img_5836.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5837',
    src: '/reviews/img_5837.jpg',
    tag: 'Raffle win',
  },
  {
    id: 'review-5838',
    src: '/reviews/img_5838.jpg',
    tag: 'Raffle win',
  },
  {
    id: 'review-5839',
    src: '/reviews/img_5839.jpg',
    tag: 'Customer journey',
  },
  {
    id: 'review-5840',
    src: '/reviews/img_5840.jpg',
    tag: 'Raffle win',
  },
  {
    id: 'review-5841',
    src: '/reviews/img_5841.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5842',
    src: '/reviews/img_5842.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5843',
    src: '/reviews/img_5843.jpg',
    tag: 'Raffle win',
  },
  {
    id: 'review-5844',
    src: '/reviews/img_5844.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5845',
    src: '/reviews/img_5845.jpg',
    tag: 'Community',
  },
  {
    id: 'review-5846',
    src: '/reviews/img_5846.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5847',
    src: '/reviews/img_5847.jpg',
    tag: 'Delivery',
  },
  {
    id: 'review-5848',
    src: '/reviews/img_5848.jpg',
    tag: 'Delivery',
  },
]

const allCustomerReviews = [...baseCustomerReviews, ...customerJourneyReviews]

function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [isMemberInfoOpen, setIsMemberInfoOpen] = useState(false)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [view, setView] = useState('home')
  const [activeReview, setActiveReview] = useState(null)
  const [orderItems, setOrderItems] = useState([
    { id: 1, productId: '', qty: 1 },
  ])
  const [itemIdSeed, setItemIdSeed] = useState(2)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    // Parallax effect for background glows
    const handleMouseMove = (e) => {
      const glows = document.querySelectorAll('.bg-glow')
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20

      glows.forEach((glow, index) => {
        const factor = (index + 1) * 0.5
        glow.style.transform = `translate(${x * factor}px, ${y * factor}px)`
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash
      const nextView = hash === '#order' ? 'order' : hash === '#reviews' ? 'reviews' : 'home'
      setView(nextView)
    }
    syncView()
    window.addEventListener('hashchange', syncView)
    return () => window.removeEventListener('hashchange', syncView)
  }, [])

  const handleRipple = (e) => {
    const button = e.currentTarget
    const ripple = document.createElement('span')
    ripple.classList.add('ripple')

    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
      pointer-events: none;
      z-index: 10;
    `

    button.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }

  const handleProtectedLink = (e) => {
    handleRipple(e)
    e.preventDefault()
    setAccessCode('')
    setAccessError('')
    setIsCodeModalOpen(true)
  }

  const toggleAdmin = (e) => {
    handleRipple(e)
    setIsAdminOpen(!isAdminOpen)
  }

  const addOrderItem = () => {
    setOrderItems((prev) => [
      ...prev,
      { id: itemIdSeed, productId: '', qty: 1 },
    ])
    setItemIdSeed((prev) => prev + 1)
  }

  const addProductToOrder = (productId) => {
    let addedNew = false
    setOrderItems((prev) => {
      const emptyIndex = prev.findIndex((item) => !item.productId)
      if (emptyIndex !== -1) {
        const updated = [...prev]
        updated[emptyIndex] = { ...updated[emptyIndex], productId, qty: updated[emptyIndex].qty || 1 }
        return updated
      }
      addedNew = true
      return [...prev, { id: itemIdSeed, productId, qty: 1 }]
    })
    if (addedNew) {
      setItemIdSeed((prev) => prev + 1)
    }
  }

  const updateOrderItem = (id, patch) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const removeOrderItem = (id) => {
    setOrderItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }

  const getProductDisplayName = (product) => {
    if (/^TR\\d+$/i.test(product.id)) {
      const mg = product.id.slice(2)
      return `${product.id} - Tirzepatide ${mg}mg`
    }
    return product.name
  }

  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return true
    const tokens = query.split(/\s+/).filter(Boolean)
    const displayName = getProductDisplayName(product).toLowerCase()
    const code = product.id.toLowerCase()
    return tokens.every((token) => displayName.includes(token) || code.includes(token))
  })

  const orderLines = orderItems.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    const qty = Number(item.qty) || 0
    const pricePhp = product?.price ?? 0
    return {
      ...item,
      product,
      price: pricePhp,
      qty,
      total: pricePhp * qty,
    }
  })

  const orderSubtotal = orderLines.reduce((sum, line) => sum + line.total, 0)
  const shippingFee = 500
  const orderTotal = orderSubtotal + shippingFee
  const formatCurrency = (value) => `PHP ${value.toFixed(2)}`

  return (
    <div className="container">
      {/* Decorative Background Elements */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      {/* DNA Pattern Overlay */}
      <div className="dna-pattern">
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-1">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-2">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-3">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 100 400" preserveAspectRatio="none" className="dna-helix dna-4">
          <path d="M50,0 Q80,50 50,100 Q20,150 50,200 Q80,250 50,300 Q20,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M50,0 Q20,50 50,100 Q80,150 50,200 Q20,250 50,300 Q80,350 50,400" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="3" fill="currentColor" /><circle cx="50" cy="150" r="3" fill="currentColor" />
          <circle cx="50" cy="250" r="3" fill="currentColor" /><circle cx="50" cy="350" r="3" fill="currentColor" />
        </svg>
        {/* Floating Logos */}
        <img src="/logo.png" alt="" className="floating-logo logo-1" aria-hidden="true" />
        <img src="/logo.png" alt="" className="floating-logo logo-2" aria-hidden="true" />
      </div>

      {/* Main Content */}
      <main className="content">
        {view === 'home' && (
          <>
            {/* Avatar/Logo */}
            <div className="avatar-container">
              <div className="avatar">
                <img src="/logo.png" alt="Mama Mica GLW Logo" className="avatar-logo" />
              </div>
              <div className="avatar-ring"></div>
            </div>

            {/* Header */}
            <header className="header">
              <h1 className="title">Mica Glow</h1>
              <p className="tagline">Your trusted glow essentials</p>
              <p className="bio">Everything you need — prices, authenticity, community, and guides.</p>
            </header>

            {/* Link Buttons */}
            <nav className="links" aria-label="Quick Links">
              {links.map((link, index) => (
                <a
                  key={link.id}
                  href={link.href}
                  className="link-btn"
                  id={link.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                  onClick={handleRipple}
                >
                  <span className="btn-icon">{link.icon}</span>
                  <span className="btn-text">{link.text}</span>
                  <span className="btn-arrow">→</span>
                </a>
              ))}

              <a
                href="https://docs.google.com/document/d/13ZxEBVB8vavnWMsOn0btVwSt4k2tV45v/edit"
                className="link-btn"
                id="access-doc"
                target="_blank"
                rel="noopener noreferrer"
                style={{ animationDelay: '0.4s' }}
                onClick={handleProtectedLink}
              >
                <span className="btn-icon">🔐</span>
                <span className="btn-text">Access to Advance Peptide Masterclass</span>
                <span className="btn-arrow">→</span>
              </a>

              <a
                href="#order"
                className="link-btn"
                id="order-calculator"
                style={{ animationDelay: '0.5s' }}
                onClick={handleRipple}
              >
                <span className="btn-icon">🧾</span>
                <span className="btn-text">Order Calculator</span>
                <span className="btn-arrow">→</span>
              </a>

              <a
                href="#reviews"
                className="link-btn"
                id="customer-reviews"
                style={{ animationDelay: '0.6s' }}
                onClick={handleRipple}
              >
                <span className="btn-icon">⭐</span>
                <span className="btn-text">Customer Reviews</span>
                <span className="btn-arrow">→</span>
              </a>

              {/* Admin Dropdown */}
              <div className="admin-dropdown" style={{ animationDelay: '0.7s' }}>
                <button
                  className={`link-btn admin-toggle ${isAdminOpen ? 'active' : ''}`}
                  onClick={toggleAdmin}
                  aria-expanded={isAdminOpen}
                >
                  <span className="btn-icon">👩‍💼</span>
                  <span className="btn-text">Contact Admin</span>
                  <span className={`btn-chevron ${isAdminOpen ? 'open' : ''}`}>▼</span>
                </button>
                <div className={`admin-menu ${isAdminOpen ? 'open' : ''}`}>
                  {adminLinks.map((admin) => (
                    <a
                      key={admin.id}
                      href={admin.href}
                      className="admin-link"
                      id={admin.id}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleRipple}
                    >
                      <span className="admin-icon">📱</span>
                      <span className="admin-name">{admin.text}</span>
                      <span className="btn-arrow">→</span>
                    </a>
                  ))}
                </div>
              </div>

            </nav>

            {/* Member Tag */}
            <div className="member-tag">
              <img src="/a4m-logo.png" alt="A4M Member" className="member-logo" />
              <div className="member-content">
                <span className="member-text">American Academy of Anti-Aging Medicine (A4M) Member</span>
                <span className="member-id">Membership #: 1718800</span>
                <button className="member-info-trigger" onClick={() => setIsMemberInfoOpen(true)}>
                  Why it matters?
                </button>
              </div>
            </div>

            {/* Member Info Modal */}
            {isMemberInfoOpen && (
              <div className="modal-overlay" onClick={() => setIsMemberInfoOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsMemberInfoOpen(false)}>×</button>
                  <h2 className="modal-title">Why Choose an A4M Member?</h2>

                  <div className="modal-body">
                    <div className="info-item">
                      <h3>🏆 Elite Expertise</h3>
                      <p>The American Academy of Anti-Aging Medicine (A4M) is the global leader in longevity medicine.</p>
                    </div>

                    <div className="info-item">
                      <h3>🔬 Cutting-Edge Care</h3>
                      <p>Members are trained in the latest metabolic and functional medicine protocols.</p>
                    </div>

                    <div className="info-item">
                      <h3>🛡️ Safety & Quality</h3>
                      <p>Ensures your provider is committed to the highest standards of clinical practice.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isAccessModalOpen && (
              <div className="modal-overlay" onClick={() => setIsAccessModalOpen(false)}>
                <div className="modal-content modal-access" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsAccessModalOpen(false)}>×</button>
                  <h2 className="modal-title">Hello 🤍</h2>
                  <div className="modal-body modal-message">
                    <p>
                      You can now access <em>Advanced Peptide Certification</em> (online) as a perk of being part of
                      our community 🤍
                    </p>
                    <p>
                      This is a free perk for being part of this space. No extra cost, just something we wanted to give
                      back and add more value for everyone who’s been here and supporting.
                    </p>
                    <p className="modal-highlight">
                      Quick reminder though, please keep this as private as possible. The materials are
                      <strong> exclusive to our community</strong> and have a watermark in place, so they can’t be
                      shared or distributed to other groups or communities. We really trust you guys on this, and it
                      helps us continue providing things like this moving forward.
                    </p>
                    <p>Thank you!</p>
                  </div>
                  <div className="modal-actions">
                    <a
                      className="modal-primary"
                      href="https://docs.google.com/document/d/13ZxEBVB8vavnWMsOn0btVwSt4k2tV45v/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Certification
                    </a>
                    <button className="modal-secondary" onClick={() => setIsAccessModalOpen(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isCodeModalOpen && (
              <div className="modal-overlay" onClick={() => setIsCodeModalOpen(false)}>
                <div className="modal-content modal-code" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={() => setIsCodeModalOpen(false)}>×</button>
                  <h2 className="modal-title">Enter Access Code</h2>
                  <p className="modal-subtitle">Use the community code to unlock the certification.</p>
                  <form
                    className="code-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!accessCode.trim()) {
                        setAccessError('Please enter the access code.')
                        return
                      }
                      if (accessCode.trim() === 'MMG082025') {
                        setIsCodeModalOpen(false)
                        setIsAccessModalOpen(true)
                        setAccessError('')
                        return
                      }
                      setAccessError('Incorrect access code.')
                    }}
                  >
                    <label className="code-label" htmlFor="access-code-input">Access Code</label>
                    <input
                      id="access-code-input"
                      className="code-input"
                      type="password"
                      placeholder="Enter code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      autoFocus
                    />
                    {accessError && <div className="code-error">{accessError}</div>}
                    <div className="modal-actions">
                      <button className="modal-primary" type="submit">Unlock</button>
                      <button
                        className="modal-secondary"
                        type="button"
                        onClick={() => setIsCodeModalOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {view === 'order' && (
          <section className="order-page">
            <button
              className="back-btn"
              onClick={() => { window.location.hash = '' }}
            >
              ← Back to Links
            </button>
            <div className="order-hero">
              <div>
                <h2 className="order-title">Order Calculator</h2>
                <p className="order-subtitle">Choose products and enter vial quantity to compute your total (per vial pricing in PHP).</p>
              </div>
              <span className="order-badge">Live Estimate</span>
              
            </div>

            <div className="order-list">
              <div className="order-search">
                <label className="order-search-label" htmlFor="product-search">Search products</label>
                <div className="order-search-field">
                  <input
                    id="product-search"
                    className="order-search-input"
                    type="text"
                    placeholder="Type a product code or name..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  {productSearch && (
                    <button
                      className="order-search-clear"
                      type="button"
                      onClick={() => setProductSearch('')}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
                <span className="order-search-count">{filteredProducts.length} products</span>
              </div>
              {productSearch.trim() && (
                <div className="order-search-results">
                  {filteredProducts.length === 0 && (
                    <div className="order-search-empty">No matching products found.</div>
                  )}
                  {filteredProducts.map((product) => (
                    <div className="order-search-item" key={product.id}>
                      <div className="order-search-info">
                        <span className="order-search-name">{getProductDisplayName(product)}</span>
                        <span className="order-search-price">{formatCurrency(product.price)}</span>
                      </div>
                      <button
                        className="order-search-add"
                        type="button"
                        onClick={() => addProductToOrder(product.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="order-header" aria-hidden="true">
                <span>Product (Per Vial)</span>
                <span>Vial Qty</span>
                <span>Line Total</span>
                <span></span>
              </div>
              {orderLines.map((line) => (
                <div className="order-row" key={line.id}>
                  <div className="order-field order-product">
                    <label className="order-label" htmlFor={`product-${line.id}`}>Product (Per Vial)</label>
                    <select
                      id={`product-${line.id}`}
                      className="order-select"
                      value={line.productId}
                      onChange={(e) => updateOrderItem(line.id, { productId: e.target.value })}
                    >
                      <option value="">Select a product</option>
                      {filteredProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {getProductDisplayName(product)} — {formatCurrency(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="order-field order-qty">
                    <label className="order-label" htmlFor={`qty-${line.id}`}>Vial Qty</label>
                    <input
                      id={`qty-${line.id}`}
                      className="order-input"
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) => updateOrderItem(line.id, { qty: e.target.value })}
                    />
                  </div>

                  <div className="order-field order-total">
                    <span className="order-label">Line Total</span>
                    <span className="order-amount">{formatCurrency(line.total)}</span>
                  </div>

                  <button
                    className="order-remove"
                    onClick={() => removeOrderItem(line.id)}
                    aria-label="Remove item"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button className="order-add" onClick={addOrderItem} type="button">
              + Add another product
            </button>

            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(orderSubtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping Fee</span>
                <strong>{formatCurrency(shippingFee)}</strong>
              </div>
              <div className="summary-row total-row">
                <span>Estimated Total</span>
                <strong>{formatCurrency(orderTotal)}</strong>
              </div>
              <p className="summary-note">Final total may change based on availability, shipping, and updates.</p>
            </div>
          </section>
        )}

        {view === 'reviews' && (
          <section className="reviews-page" id="reviews">
            <button
              className="back-btn"
              onClick={() => { window.location.hash = '' }}
            >
              ← Back to Links
            </button>
            <div className="reviews-hero">
              <div>
                <p className="section-eyebrow">Customer Reviews</p>
                <h2 className="section-title">Community wins, real deliveries, and customer journeys</h2>
                <p className="section-subtitle">
                  Screenshots from the community showing raffle wins, delivery proofs, and customer journeys.
                </p>
              </div>
            </div>

            <div className="reviews-grid">
              {allCustomerReviews.map((review) => (
                <figure className="review-card" key={review.id}>
                  <button
                    className="review-media"
                    type="button"
                    onClick={() => setActiveReview(review)}
                    aria-label="Open review image"
                  >
                    <img src={review.src} alt="Customer review image" loading="lazy" />
                  </button>
                </figure>
              ))}
              {allCustomerReviews.length === 0 && (
                <div className="review-empty">No reviews for this filter yet.</div>
              )}
            </div>
          </section>
        )}

        {activeReview && (
          <div className="modal-overlay" onClick={() => setActiveReview(null)}>
            <div className="modal-content modal-review" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveReview(null)}>×</button>
              <div className="review-lightbox">
                <img src={activeReview.src} alt="Customer review image" />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>&copy; 2026 Mica Glow</p>
        </footer>
      </main>
    </div>
  )
}

export default App
