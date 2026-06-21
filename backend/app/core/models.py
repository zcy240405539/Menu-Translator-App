from sqlalchemy import Column, BigInteger, Text, Integer, DateTime, UniqueConstraint, JSON, CheckConstraint, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.database import Base


class DishCache(Base):
    __tablename__ = "dish_cache"

    id = Column(BigInteger, primary_key=True, index=True)
    normalized_name = Column(Text, nullable=False)
    original_name = Column(Text)
    source_language = Column(Text)
    target_language = Column(Text, nullable=False)
    translated_name = Column(Text)
    description = Column(Text)
    ingredients = Column(JSONB, default=list)
    allergens = Column(JSONB, default=list)
    spicy_level = Column(Integer, default=0)
    image_prompt = Column(Text)
    cuisine = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("normalized_name", "target_language"),
        CheckConstraint(
            "btrim(normalized_name) <> '' and lower(btrim(normalized_name)) not in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')",
            name="dish_cache_normalized_name_not_blank",
        ),
    )


class DishImage(Base):
    __tablename__ = "dish_images"

    id = Column(BigInteger, primary_key=True, index=True)
    normalized_name = Column(Text, nullable=False, unique=True)
    original_name = Column(Text)
    cuisine = Column(Text)
    image_url = Column(Text)
    local_image_path = Column(Text)
    thumbnail_url = Column(Text)
    image_prompt = Column(Text)
    source_type = Column(Text, default="preset")
    rejected_urls = Column(JSONB, default=list, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        CheckConstraint(
            "btrim(normalized_name) <> '' and lower(btrim(normalized_name)) not in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')",
            name="dish_images_normalized_name_not_blank",
        ),
    )


class MenuParseCache(Base):
    __tablename__ = "menu_parse_cache"

    id = Column(BigInteger, primary_key=True, index=True)
    image_hash = Column(Text, nullable=False)
    target_language = Column(Text, nullable=False)
    source_language = Column(Text)
    restaurant_type = Column(Text)
    business_name = Column(Text, nullable=True)
    currency = Column(Text, nullable=True)
    business_description = Column(JSON, nullable=True)
    ocr_blocks = Column(JSONB)
    structure_result = Column(JSONB)
    menu_items = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("image_hash", "target_language"),
    )


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(Integer, primary_key=True, index=True)
    normalized_key = Column(Text, nullable=False)
    original_label = Column(Text, nullable=False)
    source_language = Column(Text)
    target_language = Column(Text, nullable=False)
    translated_label = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("normalized_key", "original_label", "target_language", name="menu_categories_normalized_key_original_label_target_lang_uc"),
    )


class AppConfigEntry(Base):
    __tablename__ = "app_config_entries"

    id = Column(BigInteger, primary_key=True, index=True)
    namespace = Column(Text, nullable=False)
    key = Column(Text, nullable=False)
    value = Column(JSONB, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("namespace", "key", name="app_config_entries_namespace_key_uc"),
        CheckConstraint("btrim(namespace) <> ''", name="app_config_entries_namespace_not_blank"),
        CheckConstraint("btrim(key) <> ''", name="app_config_entries_key_not_blank"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Text, primary_key=True, index=True)  # Supabase Auth User UUID
    username = Column(Text, nullable=False, unique=True)
    email = Column(Text, nullable=False, unique=True)
    role = Column(Text, default="normal", nullable=False)
    phone = Column(Text, nullable=True)
    avatar_url = Column(Text, nullable=True)
    diets = Column(JSONB, default=list)  # e.g. ["Vegetarian", "Gluten-Free"]
    allergies = Column(JSONB, default=list)  # e.g. ["nuts", "seafood"]
    budget = Column(Text, nullable=True)
    taste = Column(Text, nullable=True)
    preferred_language = Column(Text, default="zh")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        CheckConstraint(
            "role IN ('super user', 'admin', 'normal')",
            name="chk_user_role",
        ),
    )


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    plan = Column(Text, nullable=False, default="free")
    status = Column(Text, nullable=False, default="active")
    is_expired = Column(Boolean, default=False, nullable=False)
    expired_at = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id = Column(Text, nullable=True)
    stripe_subscription_id = Column(Text, nullable=True)
    purchase_token = Column(Text, nullable=True)
    original_transaction_id = Column(Text, nullable=True)
    store_type = Column(Text, nullable=True)
    membership_level = Column(Text, nullable=False, default="free", server_default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        CheckConstraint(
            "membership_level IN ('free', 'premium', 'pro')",
            name="chk_membership_level",
        ),
        CheckConstraint(
            "plan IN ('free', 'premium', 'pro')",
            name="chk_plan_values",
        ),
    )


class UserMenuHistory(Base):
    __tablename__ = "user_menu_history"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    menu_hash = Column(Text, nullable=True, index=True)
    source_uri = Column(Text, nullable=True)
    target_language = Column(Text, nullable=True)
    source_language = Column(Text, nullable=True)
    business_name = Column(Text, nullable=True)
    restaurant_type = Column(Text, nullable=True)
    currency = Column(Text, nullable=True)
    menu_result = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint("user_id", "menu_hash", "target_language", name="user_menu_history_user_hash_target_uc"),
    )


class UserCartState(Base):
    __tablename__ = "user_cart_state"

    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    items = Column(JSONB, nullable=False, default=list)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NoiseKeyword(Base):
    __tablename__ = "noise_keywords"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(Text, nullable=False)
    source_language = Column(Text, nullable=True)
    __table_args__ = (
        UniqueConstraint("source_language", "keyword", name="noise_keywords_source_keyword_uc"),
    )


class UnitTranslation(Base):
    __tablename__ = "unit_translations"

    id = Column(Integer, primary_key=True, index=True)
    source_unit = Column(Text, nullable=False)
    source_language = Column(Text, nullable=True)
    target_lang = Column(Text, nullable=False)
    translated_unit = Column(Text, nullable=False)
    __table_args__ = (
        UniqueConstraint("source_unit", "source_language", "target_lang", name="unique_unit_source_target_lang"),
    )


class TranslationGlossaryTerm(Base):
    __tablename__ = "translation_glossary_terms"

    id = Column(Integer, primary_key=True, index=True)
    source_text = Column(Text, nullable=False)
    source_language = Column(Text)
    target_language = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    context = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    __table_args__ = (
        UniqueConstraint(
            "source_text",
            "source_language",
            "target_language",
            name="translation_glossary_terms_source_target_uc",
        ),
    )

