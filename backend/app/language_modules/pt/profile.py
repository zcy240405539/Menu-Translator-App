from app.language_modules.base import LanguageProfile


PROFILE = LanguageProfile(
    code="pt",
    family="latin",
    display_name="Portuguese",
    aliases=("portuguese", "português", "portugues", "pt-pt", "pt-br"),
    local_ocr_lang="latin",
    openrouter_layout_model_env="OPENROUTER_LAYOUT_MODEL_PT",
    gemini_structure_model_env="GEMINI_MENU_STRUCTURE_MODEL_PT",
    ocr_rules=(
        "Preserve Portuguese accents, ç, contractions, and regional spellings.",
        "Treat dietary marks and serving-size abbreviations as item metadata.",
    ),
    layout_rules=(
        "Group dishes under Entradas, Petiscos, Pratos, Peixes, Carnes, Sobremesas, and Bebidas.",
        "Keep couvert, dose, meia dose, and menu executivo options with the related item.",
    ),
    price_rules=(
        "Recognize €, R$, comma decimals, and prices placed in a separate right-hand column.",
        "Do not confuse dish numbers, weights, or serving counts with prices.",
    ),
    currency_markers=("€", "EUR", "R$"),
    unit_rules=("Treat dose, meia dose, porção, copo, garrafa, and unidade as units or options.",),
    section_noise_rules=("Exclude horário, endereço, telefone, reservas, service charges, and allergen notices."),
    section_terms=("entradas", "petiscos", "pratos", "peixes", "carnes", "acompanhamentos", "sobremesas", "bebidas"),
    cuisine_hints=("Use dish evidence such as bacalhau, caldo verde, francesinha, feijoada, pastel, and picanha."),
    detection_stopwords=(
        "com", "e", "entrada", "entradas", "petiscos", "prato", "pratos", "peixes",
        "carnes", "sobremesa", "sobremesas", "bebidas", "porção",
    ),
    detection_regexes=(
        r"\b(?:entradas|petiscos|pratos|peixes|acompanhamentos|sobremesas|bebidas)\b",
        r"\b(?:bacalhau|feijoada|picanha|porção|coração|limão)\b",
    ),
    default_noise_keywords=("horário", "endereço", "telefone", "reservas", "taxa de serviço", "alergénios", "alérgenos"),
    default_unit_terms=(("dose", "serving"), ("porção", "portion"), ("copo", "glass"), ("garrafa", "bottle"), ("unidade", "piece")),
)
