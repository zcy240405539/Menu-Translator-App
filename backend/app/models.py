from sqlalchemy import Column, BigInteger, Text, Integer, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from database import Base


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

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MenuParseCache(Base):
    __tablename__ = "menu_parse_cache"

    id = Column(BigInteger, primary_key=True, index=True)

    image_hash = Column(Text, nullable=False)
    target_language = Column(Text, nullable=False)

    source_language = Column(Text)
    restaurant_type = Column(Text)

    ocr_blocks = Column(JSONB)
    structure_result = Column(JSONB)
    menu_items = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("image_hash", "target_language"),
    )