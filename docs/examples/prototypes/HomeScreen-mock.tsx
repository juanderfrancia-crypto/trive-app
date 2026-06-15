import { View, Text, TouchableOpacity } from "react-native";
import { COLORS } from "../theme/colors";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 20 }}>
      
      {/* HEADER */}
      <Text style={{
        fontSize: 28,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 20
      }}>
        TRIVE
      </Text>

      {/* CARD */}
      <View style={{
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20
      }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          Ruta activa
        </Text>

        <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>
          3 vehículos disponibles
        </Text>
      </View>

      {/* BUTTON */}
      <TouchableOpacity style={{
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 20,
        alignItems: "center"
      }}>
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Buscar viaje
        </Text>
      </TouchableOpacity>

    </View>
  );
}