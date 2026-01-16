import { Product, Promotion } from "../models/index.js";

export async function seedIfEmpty() {
  const productCount = await Product.count();
  if (productCount) return;

  const [financas, concursos, marketing, gestao] = await Product.bulkCreate([
    {
      name: "Financas inteligentes",
      description: "Planilhas, simuladores e atalhos para decisoes seguras.",
      imageUrl: "/images/financas.jpg",
      regularPrice: 297,
      linkDemo: "https://exemplo.com/demo-financas",
      linkVideo: "https://www.youtube.com/watch?v=demo1",
      active: true
    },
    {
      name: "Concursos acelerados",
      description: "Metodologias e materiais para avancar no menor tempo.",
      imageUrl: "/images/concursos.jpg",
      regularPrice: 247,
      linkDemo: "https://exemplo.com/demo-concursos",
      linkVideo: "https://www.youtube.com/watch?v=demo2",
      active: true
    },
    {
      name: "Marketing de performance",
      description: "Campanhas, funis e automacoes prontos para usar.",
      imageUrl: "/images/marketing.jpg",
      regularPrice: 497,
      linkDemo: "https://exemplo.com/demo-marketing",
      linkVideo: "https://www.youtube.com/watch?v=demo3",
      active: true
    },
    {
      name: "Gestao de loja",
      description: "Controle de vendas, estoque e operacao com foco em margem.",
      imageUrl: "/images/gestao.jpg",
      regularPrice: 597,
      linkDemo: "https://exemplo.com/demo-gestao",
      linkVideo: "https://www.youtube.com/watch?v=demo4",
      active: true
    }
  ]);

  const consultoria = await Product.create({
    name: "Diagnostico estrategico",
    description: "Sessao para mapear gargalos e definir prioridades.",
    imageUrl: "/images/diagnostico.jpg",
    regularPrice: 900,
    linkDemo: "https://exemplo.com/demo-consultoria",
    linkVideo: "https://www.youtube.com/watch?v=demo5",
    active: true,
    type: "service"
  });

  await Promotion.bulkCreate([
    {
      title: "Promo lancamento",
      promoPrice: 197,
      itemType: "product",
      itemId: financas.id,
      active: true
    },
    {
      title: "Oferta rapida",
      promoPrice: 149,
      itemType: "product",
      itemId: concursos.id,
      active: true
    },
    {
      title: "Combo performance",
      promoPrice: 299,
      itemType: "product",
      itemId: marketing.id,
      active: true
    },
    {
      title: "Nova turma",
      promoPrice: 379,
      itemType: "product",
      itemId: gestao.id,
      active: true
    },
    {
      title: "Agenda aberta",
      promoPrice: 750,
      itemType: "service",
      itemId: consultoria.id,
      active: true
    }
  ]);
}
