const productInclude = [
  { association: 'category' },
  { association: 'brand' },
  { association: 'color' },
  { association: 'zone' }
];

function presentProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image: product.image,
    price: Number(product.price),
    category: product.category ? product.category.name : '',
    colors: product.color ? product.color.name : '',
    zone: product.zone ? product.zone.name : '',
    brand: product.brand ? product.brand.name : '',
    productCategoryId: product.productCategoryId,
    brandId: product.brandId,
    colorId: product.colorId,
    zoneId: product.zoneId,
    venueSlug: product.venueSlug || '',
    transmission: product.transmission,
    license: product.license,
    vtv: Boolean(product.vtv),
    insurance: Boolean(product.insurance)
  };
}

function presentUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    image: user.image,
    category: user.category ? user.category.name : '',
    userCategoryId: user.userCategoryId,
    isAdmin: user.category ? user.category.name === 'admin' : false
  };
}

module.exports = {
  productInclude,
  presentProduct,
  presentUser
};
