// Five manufactured outfits. `level` is an outfit stage, never a chapter or wave.
export const ARMOR_STAGES=Object.freeze([
 {level:1,id:'technique',module:'chassis',name:'Tissu technique',chapter:1,cost:0,shield:0,resistance:1,shieldResistance:1,addition:'Combinaison technique légère',description:'Tissu souple, casque fermé et protections légères. Saut simple ; les systèmes avancés se fabriquent à l’atelier.'},
 {level:2,id:'ceramique',module:'shield',name:'Céramique',chapter:2,cost:200,shield:60,resistance:.95,shieldResistance:1,addition:'Double saut et bouclier du bras gauche',description:'Coques en céramique anti-impact, impulsion de double saut et demi-sphère de protection. Rose pour GHJU, bleue pour LYLU.'},
 {level:3,id:'titane',module:'jetpack',name:'Titane',chapter:5,cost:900,shield:80,resistance:.88,shieldResistance:.95,addition:'Jetpack dorsal intégré',description:'Renforts métalliques articulés et propulseurs dorsaux. Maintenir le second saut active le jetpack pendant deux secondes au maximum.'},
 {level:4,id:'carbonatium',module:'grapple',name:'Carbonatium',chapter:9,cost:1800,shield:100,resistance:.8,shieldResistance:.9,addition:'Grappin du bras gauche · 20 mètres',description:'Composite tressé sombre, treuil et lanceur au poignet. Le grappin rejoint une paroi jusqu’à 20 m ; sauter décroche avec une impulsion.'},
 {level:5,id:'bastion',module:'bastion',name:'Bastion',chapter:15,cost:3000,shield:180,resistance:.5,shieldResistance:.65,addition:'Carbonatium + Kevlar + céramique · protection maximale',description:'Blindage multicouche, épaulières enveloppantes et renforts articulés. Dégâts à la santé réduits de 50 %, dégâts au bouclier réduits de 35 % ; toutes les capacités précédentes sont conservées.'}
].map(s=>Object.freeze(s)));
export const suitStage=n=>Math.max(1,Math.min(5,Math.floor(Number(n)||1)));
export const suitCapabilities=n=>{const s=suitStage(n);return{doubleJump:s>=2,shield:s>=2,jetpack:s>=3,grapple:s>=4};};
