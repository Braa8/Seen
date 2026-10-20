import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { adminDb } from "@/lib/firebaseAdmin";

const ALLOWED_ROLES = [
  "viewer",
  "writer",
  "editor",
  "admin",
] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * التحقق من صلاحيات المدير الحالية في Firestore،
 * بدل الاعتماد على الأدوار المخزنة في الجلسة فقط.
 */
async function getCurrentAdminId(): Promise<string | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const userSnapshot = await adminDb
    .collection("users")
    .doc(session.user.id)
    .get();

  if (!userSnapshot.exists) {
    return null;
  }

  const data = userSnapshot.data();

  const roles: unknown = data?.roles;

  if (
    !Array.isArray(roles) ||
    !roles.every((role) => typeof role === "string") ||
    !roles.includes("admin")
  ) {
    return null;
  }

  if (data?.isActive === false) {
    return null;
  }

  return session.user.id;
}

function validateRoles(value: unknown): value is AllowedRole[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (role): role is AllowedRole =>
        typeof role === "string" &&
        ALLOWED_ROLES.includes(role as AllowedRole),
    ) &&
    new Set(value).size === value.length
  );
}

// ========================================
// GET - جلب المستخدمين
// ========================================

export async function GET() {
  try {
    const adminId = await getCurrentAdminId();

    if (!adminId) {
      return errorResponse(
        "ليس لديك صلاحية الوصول إلى إدارة المستخدمين",
        403,
      );
    }

    const snapshot = await adminDb
      .collection("users")
      .get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        email: data.email ?? "",
        displayName: data.displayName ?? "",
        roles: Array.isArray(data.roles)
          ? data.roles
          : ["viewer"],
        isActive: data.isActive ?? true,
        createdAt: data.createdAt ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("GET /api/admin/users:", error);

    return errorResponse(
      "حدث خطأ أثناء جلب المستخدمين",
      500,
    );
  }
}

// ========================================
// PUT - تعديل أدوار مستخدم
// ========================================

export async function PUT(request: NextRequest) {
  try {
    const adminId = await getCurrentAdminId();

    if (!adminId) {
      return errorResponse(
        "ليس لديك صلاحية تعديل أدوار المستخدمين",
        403,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "بيانات الطلب غير صحيحة",
        400,
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse(
        "بيانات الطلب غير صحيحة",
        400,
      );
    }

    const input = body as Record<string, unknown>;
    const { userId, roles } = input;

    if (
      typeof userId !== "string" ||
      !userId.trim() ||
      !validateRoles(roles)
    ) {
      return errorResponse(
        "معرف المستخدم أو قائمة الأدوار غير صحيحة",
        400,
      );
    }

    if (userId === adminId) {
      return errorResponse(
        "لا يمكنك تعديل أدوار حسابك الخاص",
        403,
      );
    }

    const targetRef = adminDb
      .collection("users")
      .doc(userId);

    const requestedRoles = roles as AllowedRole[];

    const result = await adminDb.runTransaction(
      async (transaction) => {
        const targetSnapshot = await transaction.get(targetRef);

        if (!targetSnapshot.exists) {
          return {
            success: false as const,
            message: "المستخدم غير موجود",
            status: 404,
          };
        }

        const currentTargetRoles: unknown =
          targetSnapshot.data()?.roles;

        const targetIsAdmin =
          Array.isArray(currentTargetRoles) &&
          currentTargetRoles.includes("admin");

        const willRemainAdmin =
          requestedRoles.includes("admin");

        // حماية آخر مدير في النظام.
        if (targetIsAdmin && !willRemainAdmin) {
          const adminsQuery = adminDb
            .collection("users")
            .where("roles", "array-contains", "admin");

          const adminsSnapshot =
            await transaction.get(adminsQuery);

          if (adminsSnapshot.size <= 1) {
            return {
              success: false as const,
              message:
                "لا يمكن إزالة صلاحية المدير من آخر مدير في النظام",
              status: 409,
            };
          }
        }

        transaction.update(targetRef, {
          roles: requestedRoles,
          updatedAt: new Date(),
        });

        return {
          success: true as const,
        };
      },
    );

    if (!result.success) {
      return errorResponse(
        result.message,
        result.status,
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث أدوار المستخدم بنجاح",
    });
  } catch (error) {
    console.error("PUT /api/admin/users:", error);

    return errorResponse(
      "حدث خطأ أثناء تحديث أدوار المستخدم",
      500,
    );
  }
}