import json
import math
from pathlib import Path


class FreightCalculator:
    def __init__(self, data_path: str = "backend/data/prices.json"):
        with open(data_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

    def calculate(self, destination: str, length: float, width: float, height: float, weight: float = None):
        results = {}
        for carrier in ["DHL", "UPS", "FEDEX"]:
            results[carrier] = self._calculate_carrier(carrier, destination, length, width, height, weight)
        return results

    def _calculate_carrier(self, carrier: str, destination: str, length: float, width: float, height: float, weight: float = None):
        carrier_data = self.data["carriers"][carrier]

        if destination not in carrier_data["country_zones"]:
            return {"error": f"不支持的目的地: {destination}"}

        volumetric_weight = self._calculate_volumetric_weight(carrier, length, width, height)
        actual_weight = weight if weight else 0
        chargeable_weight = max(volumetric_weight, actual_weight)

        size_limits = carrier_data["size_limits"]
        if length > size_limits["length"] or width > size_limits["width"] or height > size_limits["height"] or chargeable_weight > size_limits["weight"]:
            return {"error": "尺寸限制"}

        country_info = carrier_data["country_zones"][destination]
        zone = country_info["zone"]
        peak_surcharge = country_info["peak_surcharge"]

        unit_price = self._get_unit_price(carrier_data, chargeable_weight, zone, destination)

        oversize_fee = self._calculate_oversize_fee(length, width, height, chargeable_weight, carrier_data["parameters"])

        params = carrier_data["parameters"]
        fuel_rate = params["fuel_rate"]
        profit_rate = params["profit_rate"]
        threshold = params["heavy_weight_threshold"]

        # 修正计算公式的判断逻辑：
        # - 所有国家：≤31kg 使用轻货公式
        # - 特殊国家（美国、加拿大、澳大利亚、新西兰）：≤31kg 使用轻货公式（与其他国家相同）
        # - 所有国家：>31kg 使用重货公式
        use_light_formula = chargeable_weight <= 31

        if use_light_formula:
            # 轻货公式: (单价 + 计费重量 × 旺季附加费 + 超长附加费) × 燃油 × 利润
            total_price = (unit_price + chargeable_weight * peak_surcharge + oversize_fee) * fuel_rate * profit_rate
        else:
            # 重货公式: ((单价 + 旺季附加费) × 计费重量 + 超长附加费) × 燃油 × 利润
            total_price = ((unit_price + peak_surcharge) * chargeable_weight + oversize_fee) * fuel_rate * profit_rate

        return {
            "volumetric_weight": round(volumetric_weight, 2),
            "chargeable_weight": round(chargeable_weight, 2),
            "unit_price": round(unit_price, 2),
            "peak_surcharge": round(peak_surcharge, 2),
            "oversize_fee": round(oversize_fee, 2),
            "fuel_rate": fuel_rate,
            "profit_rate": profit_rate,
            "total_price": round(total_price, 2),
            "error": None
        }

    def _calculate_volumetric_weight(self, carrier: str, length: float, width: float, height: float) -> float:
        volume = length * width * height
        base_weight = volume / 5000

        if carrier == "DHL":
            return math.ceil(base_weight * 2) / 2
        elif carrier == "UPS":
            if (width + height) * 2 + max(length, width, height) > 300 and base_weight < 40:
                return 40
            return math.ceil(base_weight * 2) / 2
        elif carrier == "FEDEX":
            if ((width + height) * 2 + length >= 330 or max(length, width, height) >= 274) and base_weight < 68:
                return 68
            return math.ceil(base_weight * 2) / 2

        return math.ceil(base_weight * 2) / 2

    def _get_unit_price(self, carrier_data: dict, weight: float, zone: int, destination: str) -> float:
        """获取单价，对于超过30kg的重量使用特殊单价"""

        # 检查是否有超重单价数据
        if weight > 30 and "heavy_prices" in carrier_data:
            heavy_prices = carrier_data["heavy_prices"]
            if destination in heavy_prices:
                # 根据重量选择对应的单价
                if weight <= 300:
                    return heavy_prices[destination]["price_21_300"]
                else:
                    return heavy_prices[destination]["price_301_plus"]

        # 使用普通价格表
        price_table = carrier_data["price_table"]
        weight_key = str(math.ceil(weight * 2) / 2)

        if weight_key in price_table:
            return price_table[weight_key].get(f"zone{zone}", 0)

        for w in sorted([float(k) for k in price_table.keys()]):
            if w >= weight:
                return price_table[str(w)].get(f"zone{zone}", 0)

        return 0

    def _calculate_oversize_fee(self, length: float, width: float, height: float, weight: float, params: dict) -> float:
        fee1 = params["oversize_fee"] if max(length, width, height) > 120 else 0
        fee2 = params["overweight_fee"] if weight > 70 else 0
        return max(fee1, fee2)

    def get_countries(self) -> list:
        countries = set()
        for carrier_data in self.data["carriers"].values():
            countries.update(carrier_data["country_zones"].keys())
        return sorted(list(countries))
