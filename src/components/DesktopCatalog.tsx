import { Link } from 'react-router-dom';
import {useCategories} from '../lib/categoriesStore';
import {useModels} from '../lib/modelsStore';
import {buildGeneralWhatsAppLink} from '../lib/whatsapp';
import ProductCard from './ProductCard';

/** Approved desktop catalog. Uses the actual stores and the existing mobile card component. */
export default function DesktopCatalog(){
  const categories=useCategories(),models=useModels();
  return <div className="desktop-catalog-proposal">{categories.map(category=>{
    const items=models.filter(model=>model.category===category.id);
    return <section key={category.id} className="desktop-category-proposal" aria-label={category.label}>
      <div className="desktop-category-heading"><h2>{category.label}</h2><Link to={`/${category.id}`}>عرض الكل</Link></div>
      {items.length ? <div className="desktop-model-grid" style={{gridTemplateColumns:`repeat(${Math.min(items.length,5)},minmax(0,1fr))`,maxWidth:items.length<=2?`${items.length*340+(items.length-1)*24}px`:undefined}}>
        {items.map(model=><ProductCard key={model.id} model={model}/>)}
      </div> : <div className="desktop-empty-category"><p>موديلات هذا القسم بالطريق</p><a href={buildGeneralWhatsAppLink()} target="_blank" rel="noopener noreferrer">تواصل معنا عبر واتساب</a></div>}
    </section>;
  })}</div>;
}
