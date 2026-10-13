-- ============================================================
-- 图书借阅系统（后台）数据库脚本
-- 目标数据库：MySQL 8.0
-- 依据：《2016年10月学士后Java毕业考试机试试卷-2》第三节 数据库设计
-- ============================================================

DROP DATABASE IF EXISTS library_borrowing;
CREATE DATABASE library_borrowing
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE library_borrowing;

-- ------------------------------------------------------------
-- 图书类型表 book_type
-- ------------------------------------------------------------
DROP TABLE IF EXISTS book_type;
CREATE TABLE book_type (
  id        INT          NOT NULL AUTO_INCREMENT COMMENT '主键，自动增长',
  typeName  VARCHAR(50)  NOT NULL                COMMENT '图书类型名称',
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '图书类型表';

-- ------------------------------------------------------------
-- 图书信息表 book_info
-- bookType 存 book_type.id，试卷要求"具体类型数据必须来源于图书类型表"
-- bookAuthor 在试卷表结构中类型为"整数"，与字段说明"图书作者"矛盾，按字符串处理
-- ------------------------------------------------------------
DROP TABLE IF EXISTS book_info;
CREATE TABLE book_info (
  bookId         INT          NOT NULL AUTO_INCREMENT COMMENT '图书ID，主键，自动增长',
  bookCode       VARCHAR(20)  NOT NULL                COMMENT '图书编号',
  bookName       VARCHAR(100) NOT NULL                COMMENT '图书名称',
  bookType       INT          NOT NULL                COMMENT '图书类型，外键指向 book_type.id',
  bookAuthor     VARCHAR(50)  NOT NULL                COMMENT '图书作者',
  publishPress   VARCHAR(50)  NOT NULL                COMMENT '出版社',
  publishDate    DATE         NOT NULL                COMMENT '出版日期',
  borrowed       TINYINT      NOT NULL DEFAULT 0      COMMENT '是否借阅：1 已借阅，0 未借阅',
  createdBy      VARCHAR(20)  NOT NULL                COMMENT '入库人',
  creationTime   DATETIME     NOT NULL                COMMENT '入库时间',
  lastUpdatetime DATETIME     NULL                    COMMENT '最新更新时间',
  PRIMARY KEY (bookId),
  KEY idx_book_info_bookType (bookType),
  KEY idx_book_info_creationTime (creationTime),
  CONSTRAINT fk_book_info_book_type
    FOREIGN KEY (bookType) REFERENCES book_type (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '图书信息表';

-- ------------------------------------------------------------
-- 测试数据：图书类型（试卷新增页下拉框列出的八种类型）
-- ------------------------------------------------------------
INSERT INTO book_type (id, typeName) VALUES
  (1, '小说'),
  (2, '文学'),
  (3, '传记'),
  (4, '艺术'),
  (5, '少儿'),
  (6, '经济'),
  (7, '管理'),
  (8, '科技');

-- ------------------------------------------------------------
-- 测试数据：图书（取自试卷图-1 列表页展示的五条记录）
-- ------------------------------------------------------------
INSERT INTO book_info
  (bookId, bookCode, bookName, bookType, bookAuthor, publishPress,
   publishDate, borrowed, createdBy, creationTime, lastUpdatetime)
VALUES
  (23, 'BK000023', '企业应用架构模式', 8, '（英）Martin Fowler', '机械工业出版社',
   '2014-07-03', 0, 'admin', '2014-07-03 09:15:00', NULL),
  (24, 'BK000024', '精通Hibernate', 8, '刘洋', '电子工业出版社',
   '2014-05-03', 1, 'admin', '2014-05-03 14:20:00', NULL),
  (25, 'BK000025', '天龙八部', 1, '金庸', '中原出版社',
   '2014-03-12', 0, 'admin', '2014-03-12 10:05:00', NULL),
  (26, 'BK000026', '寻找家园', 4, '高尔泰', '北京十月文艺出版社',
   '2014-03-01', 0, 'admin', '2014-03-01 16:40:00', NULL),
  (27, 'BK000027', '小猫莫格成长系列', 5, '（英）朱迪斯·克尔', '接力出版社',
   '2014-01-01', 1, 'admin', '2014-01-01 08:30:00', NULL);
